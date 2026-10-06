import { useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { api, SITE_URL } from "./api";

// Push notifications through the free mstc-push Cloudflare Worker + Firebase Cloud Messaging.
// If the push Worker URL or the Firebase file isn't set up, everything here quietly does nothing.
const PUSH_URL = (process.env.EXPO_PUBLIC_PUSH_URL ?? "").replace(/\/$/, "");
const REG_KEY = "mstc:push-reg";
const SEEN_KEY = "mstc:push-seen";
const WEEK = 7 * 24 * 3600 * 1000;

// Show the notification even while the app is open.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }) as any,
  });
} catch {}

async function registerForPush() {
  if (!PUSH_URL || Platform.OS !== "android") return;
  try {
    // Android 8+ needs a channel; the Worker sends to channel "mstc".
    await Notifications.setNotificationChannelAsync("mstc", {
      name: "MSTC updates",
      importance: Notifications.AndroidImportance.HIGH,
    });
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;

    const token = String((await Notifications.getDevicePushTokenAsync()).data);
    const saved = JSON.parse((await AsyncStorage.getItem(REG_KEY)) ?? "null");
    if (saved && saved.token === token && Date.now() - saved.at < WEEK) return; // already registered recently

    const res = await fetch(`${PUSH_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) await AsyncStorage.setItem(REG_KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    // no Firebase config in this build, offline, etc. — try again next launch
  }
}

async function openFromNotification(data: any, router: ReturnType<typeof useRouter>) {
  try {
    if (data?.kind === "announcement" && data.url) {
      router.push({ pathname: "/article", params: { url: data.url, title: data.title ?? "Announcement", category: "community" } });
    } else if (data?.kind === "event" || data?.kind === "reminder") {
      const events = await api.listEvents();
      const ev = events.find((e) => e.id === String(data.id) || e.id.startsWith(`${data.id}-`));
      if (ev?.url) {
        router.push({ pathname: "/article", params: { url: ev.url, title: ev.title, date: ev.date ?? "", category: "event" } });
      } else {
        router.push({ pathname: "/website", params: { u: `${SITE_URL}/events` } });
      }
    }
  } catch {}
}

export function usePushSetup() {
  const router = useRouter();
  useEffect(() => {
    if (!PUSH_URL) return;
    registerForPush();

    let sub: { remove: () => void } | undefined;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((r) => {
        openFromNotification(r.notification.request.content.data, router);
      });
      // app was closed and opened by tapping a notification
      Notifications.getLastNotificationResponseAsync().then(async (r) => {
        if (!r) return;
        const id = r.notification.request.identifier;
        if ((await AsyncStorage.getItem(SEEN_KEY)) === id) return;
        await AsyncStorage.setItem(SEEN_KEY, id);
        openFromNotification(r.notification.request.content.data, router);
      });
    } catch {}
    return () => sub?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
