import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { Cue } from "./timerLogic";

// Short beeps for the timer and warm-up guide. Everything is wrapped in try/catch:
// a sound problem must never crash a workout.
const SOURCES = {
  beep: require("../assets/sounds/beep.wav"),
  start: require("../assets/sounds/start.wav"),
  rest: require("../assets/sounds/rest.wav"),
  done: require("../assets/sounds/done.wav"),
} as const;

const KEY = "mstc:sound";
let enabled = true;
let modeSet = false;
const players: Partial<Record<keyof typeof SOURCES, AudioPlayer>> = {};
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === "0") {
      enabled = false;
      listeners.forEach((f) => f());
    }
  })
  .catch(() => {});

async function ensureMode() {
  if (modeSet) return;
  modeSet = true;
  try {
    // play even if the phone is on silent, and don't stop the user's music
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" });
  } catch {}
}

export function cue(name: Cue) {
  if (name === "none") return;
  try {
    Haptics.impactAsync(
      name === "beep" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy,
    ).catch(() => {});
  } catch {}
  if (!enabled) return;
  ensureMode();
  try {
    const p = (players[name] ??= createAudioPlayer(SOURCES[name]));
    p.seekTo(0);
    p.play();
  } catch {}
}

export function useSoundEnabled() {
  const [on, setOn] = useState(enabled);
  useEffect(() => {
    const f = () => setOn(enabled);
    listeners.add(f);
    f();
    return () => {
      listeners.delete(f);
    };
  }, []);
  const set = (next: boolean) => {
    enabled = next;
    AsyncStorage.setItem(KEY, next ? "1" : "0").catch(() => {});
    listeners.forEach((f) => f());
  };
  return [on, set] as const;
}
