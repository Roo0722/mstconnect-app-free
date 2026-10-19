// Turns the plan into reminders on the phone (local notifications: free, no server).
// Reminders are rebuilt whenever the app opens or the plan, training log or events change.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { api } from "../api";
import { buildReminders, cancelledEvents, eventWhen, type Plan, type PlanEvent } from "./engine";
import { getPlan } from "./store";

const CHANNEL = "plan";
const KNOWN_KEY = "mstc:plan:events"; // events we have set reminders for: id -> title
const TOLD_KEY = "mstc:plan:cancel-told";
const PUSH_REG_KEY = "mstc:push-reg"; // set by push.ts when this phone is registered with the push Worker

export async function ensureReminderPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const have = await Notifications.getPermissionsAsync();
    if (have.granted) return true;
    if (!have.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

let running: Promise<void> | null = null;
let again = false;

// Safe to call often: overlapping calls are merged into one more run.
export function syncReminders(trainedToday: boolean): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await run(trainedToday).catch(() => {});
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function run(trainedToday: boolean) {
  if (Platform.OS !== "android") return;
  const plan: Plan = await getPlan();
  const granted = (await Notifications.getPermissionsAsync().catch(() => null))?.granted ?? false;

  let events: PlanEvent[] | null = null;
  if (plan.eventsOn) {
    try {
      events = (await api.listEvents()) as PlanEvent[];
    } catch {
      events = null; // offline: keep the event reminders we already have
    }
  }

  const existing = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const mine = existing.filter((n) => (n.content.data as any)?.plan === true);
  const keep = events === null ? mine.filter((n) => (n.content.data as any)?.kind === "event") : [];
  for (const n of mine) {
    if (!keep.includes(n)) await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
  }
  if (!granted || !(plan.remindersOn || plan.eventsOn)) return;

  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "Training and event reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => {});

  const serverReminders = !!(await AsyncStorage.getItem(PUSH_REG_KEY).catch(() => null));
  const now = Date.now();
  const list = buildReminders({ plan, events: events ?? null, now, trainedToday, serverReminders });
  for (const r of list) {
    if (events === null && r.kind === "event") continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: r.title,
        body: r.body,
        data: r.kind === "event" ? { plan: true, kind: "event", id: r.eventId } : { plan: true, kind: "training" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: CHANNEL },
    }).catch(() => {});
  }

  if (events) {
    // remember which upcoming events the player has reminders for, and say so once when one is cancelled
    const known = await readJson<Record<string, string>>(KNOWN_KEY, {});
    const told = await readJson<string[]>(TOLD_KEY, []);
    for (const e of cancelledEvents(events, known, now)) {
      if (told.includes(e.id)) continue;
      told.push(e.id);
      await Notifications.scheduleNotificationAsync({
        content: { title: `Event cancelled: ${e.title}`, body: "It has been removed from your plan.", data: { plan: true, kind: "event", id: e.id } },
        trigger: null,
      }).catch(() => {});
    }
    const next: Record<string, string> = {};
    for (const e of events) {
      const w = eventWhen(e);
      if (!e.past && w && (w.start ?? w.day + 86_400_000) > now) next[e.id] = e.title;
    }
    // keep ones that just moved to Past (so the cancelled check can see them) until they have started
    for (const e of events) {
      const w = eventWhen(e);
      if (e.past && known[e.id] && w && (w.start ?? w.day + 86_400_000) > now) next[e.id] = known[e.id];
    }
    await AsyncStorage.setItem(KNOWN_KEY, JSON.stringify(next)).catch(() => {});
    await AsyncStorage.setItem(TOLD_KEY, JSON.stringify(told.slice(-50))).catch(() => {});
  }
}
