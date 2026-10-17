// Measures how long a training tool really runs and saves it to the training log.
// Saves when you pause, when you leave the screen, and once a minute while running, so a closed app keeps its minutes.
import { useEffect, useRef } from "react";
import type { Kind } from "./config";
import { newId, upsertActivity } from "./store";

const MIN_SAVE_MS = 60_000; // under a minute is just fiddling with the buttons

export function useActivityTracker(kind: Kind, running: boolean, detail?: string) {
  const st = useRef({ id: newId(), start: 0, acc: 0, mark: 0 });
  const info = useRef({ kind, detail });
  info.current = { kind, detail };

  useEffect(() => {
    if (!running) return;
    const s = st.current;
    if (!s.start) s.start = Date.now();
    s.mark = Date.now();
    const save = () => {
      const active = s.acc + (s.mark ? Date.now() - s.mark : 0);
      if (active < MIN_SAVE_MS) return;
      upsertActivity({ id: s.id, kind: info.current.kind, start: s.start, end: Date.now(), minutes: Math.round((active / 60_000) * 10) / 10, detail: info.current.detail });
    };
    const iv = setInterval(save, 60_000);
    return () => {
      clearInterval(iv);
      s.acc += Date.now() - s.mark;
      s.mark = 0;
      save();
    };
  }, [running]);
}
