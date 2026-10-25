// Keeps the training log on this phone (AsyncStorage) and lets screens listen for changes.
import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Kind } from "./config";
import { computeGame, type Activity, type GameState } from "./engine";

const KEY = "mstc:game:v1";
const MAX_KEEP = 1200; // plenty: a few years of daily training

let cache: Activity[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
let chain: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

function load(): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) {
        const v = JSON.parse(raw);
        if (Array.isArray(v?.activities)) cache = v.activities.filter(valid);
      }
    })
    .catch(() => {})
    .finally(() => {
      loaded = true;
      emit();
    });
  return loading;
}

const valid = (a: any): a is Activity =>
  a && typeof a.id === "string" && typeof a.start === "number" && typeof a.end === "number" && typeof a.minutes === "number" && a.minutes > 0;

function persist() {
  chain = chain.then(() => AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, activities: cache })).catch(() => {}));
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Add an activity, or update it when the same id is saved again (a running session saves itself every minute).
export async function upsertActivity(a: Activity) {
  await load();
  const i = cache.findIndex((x) => x.id === a.id);
  const next = i >= 0 ? cache.map((x, k) => (k === i ? a : x)) : [...cache, a];
  cache = next.length > MAX_KEEP ? next.sort((p, q) => p.start - q.start).slice(next.length - MAX_KEEP) : next;
  persist();
  emit();
}

// Log a session by hand: it ends now and lasted `minutes`.
export function logManual(kind: Kind, minutes: number) {
  const end = Date.now();
  return upsertActivity({ id: newId(), kind, start: end - minutes * 60_000, end, minutes, manual: true });
}

// Restore from a backup file: add the sessions we don't have yet (same id = same session, keep the longer one).
export async function mergeActivities(incoming: unknown[]): Promise<{ added: number; total: number }> {
  await load();
  const byId = new Map(cache.map((a) => [a.id, a]));
  let added = 0;
  for (const a of incoming) {
    if (!valid(a)) continue;
    const have = byId.get(a.id);
    if (!have) added++;
    if (!have || a.minutes > have.minutes) byId.set(a.id, a);
  }
  let next = [...byId.values()].sort((p, q) => p.start - q.start);
  if (next.length > MAX_KEEP) next = next.slice(next.length - MAX_KEEP);
  cache = next;
  persist();
  emit();
  return { added, total: cache.length };
}

export async function getActivities(): Promise<Activity[]> {
  await load();
  return cache;
}

export async function clearAll() {
  await load();
  cache = [];
  persist();
  emit();
}

export function useActivities() {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    load();
    return () => {
      listeners.delete(f);
    };
  }, []);
  return { activities: cache, loaded };
}

// The whole game state, recomputed when the log changes. `now` is read when the screen renders.
export function useGame(): { game: GameState; loaded: boolean } {
  const { activities, loaded } = useActivities();
  const game = useMemo(() => computeGame(activities, Date.now()), [activities]);
  return { game, loaded };
}
