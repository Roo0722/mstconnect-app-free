import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "./query-client";

// Offline copy of what you last saw: events, announcements and the posts you opened.
// Online: every successful load is saved on the phone. Offline (or when the website is down): the saved copy is shown.
const PREFIX = "mstc:cache:";
const ARTICLE_INDEX = `${PREFIX}article-index`;
const KEEP_ARTICLES = 30;

type Saved<T> = { at: number; data: T };

export async function readSaved<T>(key: string): Promise<Saved<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Saved<T>;
    return v && typeof v.at === "number" && "data" in v ? v : null;
  } catch {
    return null;
  }
}

async function write<T>(key: string, data: T) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {}
}

// keep only the newest posts so the saved copy stays small
async function rememberArticle(key: string) {
  try {
    const list: string[] = JSON.parse((await AsyncStorage.getItem(ARTICLE_INDEX)) ?? "[]");
    const next = [key, ...list.filter((k) => k !== key)];
    const drop = next.slice(KEEP_ARTICLES);
    if (drop.length) await AsyncStorage.multiRemove(drop.map((k) => PREFIX + k));
    await AsyncStorage.setItem(ARTICLE_INDEX, JSON.stringify(next.slice(0, KEEP_ARTICLES)));
  } catch {}
}

// ---------- "showing a saved copy" state ----------
let staleSince: number | null = null; // when the copy on screen was saved, or null when everything is live
const listeners = new Set<() => void>();
function setStale(v: number | null) {
  if (v === staleSince) return;
  staleSince = v;
  listeners.forEach((f) => f());
}
export function useStaleSince(): number | null {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => staleSince,
    () => null,
  );
}

// Try the network first; on any failure fall back to the saved copy, if there is one.
export async function withCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  try {
    const data = await load();
    setStale(null);
    write(key, data);
    if (key.startsWith("article:")) rememberArticle(key);
    return data;
  } catch (e) {
    const saved = await readSaved<T>(key);
    if (!saved) throw e;
    setStale(saved.at);
    return saved.data;
  }
}

// Put the saved copy into the screens right at startup, so they show something before the network answers.
export async function hydrateFromSaved(pickNext: (events: any[]) => any) {
  const [anns, events] = await Promise.all([readSaved<any[]>("announcements"), readSaved<any[]>("events")]);
  const put = (k: unknown[], v: unknown, at: number) => {
    if (queryClient.getQueryData(k) === undefined) queryClient.setQueryData(k, v, { updatedAt: at });
  };
  if (anns) put(["announcements"], anns.data, anns.at);
  if (events) {
    put(["events"], events.data, events.at);
    put(["events-list"], events.data, events.at);
    put(["next-event"], pickNext(events.data), events.at);
  }
}

// When the app comes back to the front and we were showing a saved copy, try again.
export function retryWhenBack() {
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active" && staleSince !== null) queryClient.invalidateQueries();
  });
  return () => sub.remove();
}

export function retryNow() {
  return queryClient.invalidateQueries();
}
