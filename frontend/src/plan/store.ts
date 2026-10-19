// The weekly plan lives on this phone (AsyncStorage). Screens listen for changes.
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cleanPlan, DEFAULT_PLAN, type Plan } from "./engine";

const KEY = "mstc:plan:v1";
let cache: Plan = DEFAULT_PLAN;
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

function load(): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) cache = cleanPlan(JSON.parse(raw));
    })
    .catch(() => {})
    .finally(() => {
      loaded = true;
      emit();
    });
  return loading;
}

export async function savePlan(next: Plan) {
  await load();
  cache = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => {});
}

export const getPlan = async () => {
  await load();
  return cache;
};

export function usePlan() {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    load();
    return () => {
      listeners.delete(f);
    };
  }, []);
  return { plan: cache, loaded };
}
