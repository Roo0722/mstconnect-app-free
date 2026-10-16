// Pure timing logic for step-by-step guided routines (warm-up, advanced stretches, ...).
// Times are in integer milliseconds. No React in here so it can be tested in plain node.
import type { Cue } from "./timerLogic";

export type Seg = { label?: string; seconds: number; reps?: number; beat?: number };
export type Routine = { segments: Seg[] }[];

// A short "Get ready" gap at the start of every exercise, so you can change position before it begins.
export const PREP_LABEL = "Get ready";
export const PREP_SECONDS = 5;
export const withPrep = <T extends { segments: Seg[] }>(steps: T[], seconds = PREP_SECONDS): T[] =>
  steps.map((s) => ({ ...s, segments: [{ label: PREP_LABEL, seconds }, ...s.segments] }));
export const isPrep = (g?: Seg) => g?.label === PREP_LABEL;

export const stepMs = (s: { segments: Seg[] }) => Math.round(s.segments.reduce((a, g) => a + g.seconds, 0) * 1000);

export type Where = { seg: number; segElapsed: number; rep: number | null; reps: number | null; hold: boolean };

export function locate(step: { segments: Seg[] }, elapsedMs: number): Where {
  let start = 0;
  for (let i = 0; i < step.segments.length; i++) {
    const g = step.segments[i];
    const len = Math.round(g.seconds * 1000);
    if (elapsedMs < start + len || i === step.segments.length - 1) {
      const se = Math.max(0, Math.min(len, elapsedMs - start));
      const reps = g.reps ?? null;
      const rep = reps ? Math.min(reps, Math.floor(se / (len / reps)) + 1) : null;
      return { seg: i, segElapsed: se, rep, reps, hold: !g.reps && !g.beat };
    }
    start += len;
  }
  return { seg: 0, segElapsed: 0, rep: null, reps: null, hold: true };
}

// All cue moments inside one step: [timeMs, cue]
export function stepEvents(step: { segments: Seg[] }, opts?: { followedByPrep?: boolean }): [number, Cue][] {
  const total = stepMs(step);
  const ev: [number, Cue][] = [];
  let start = 0;
  const hasPrep = isPrep(step.segments[0]);
  step.segments.forEach((g, i) => {
    const len = Math.round(g.seconds * 1000);
    if (isPrep(g)) {
      // 3-2-1 before the exercise begins, then a clear "go" when it does
      for (const k of [3000, 2000, 1000]) if (len - k > 0) ev.push([start + len - k, "beep"]);
    } else if (i > 0) ev.push([start + 0, i === 1 && hasPrep ? "start" : "switch"]);
    if (g.reps && g.reps > 1) {
      for (let k = 1; k < g.reps; k++) ev.push([start + Math.round((len * k) / g.reps), "tick"]);
    } else if (g.beat) {
      const b = Math.round(g.beat * 1000);
      for (let t = b; t < len; t += b) ev.push([start + t, "tick"]);
    }
    start += len;
  });
  // quiet tail: no ticks in the last 3 s, and a 3-2-1 countdown instead
  const out = ev.filter(([t, c]) => c !== "tick" || t <= total - 3000);
  // the 3-2-1 before "Get ready" already counts you in, so only the very last exercise ends with one
  if (total > 5000 && !(opts?.followedByPrep)) for (const k of [3000, 2000, 1000]) out.push([total - k, "beep"]);
  return out.sort((a, b) => a[0] - b[0]);
}

const PRIORITY: Record<Cue, number> = { none: 0, tick: 1, beep: 2, switch: 3, start: 4, rest: 4, done: 5 };
const strongest = (cues: Cue[]): Cue => cues.reduce<Cue>((a, c) => (PRIORITY[c] > PRIORITY[a] ? c : a), "none");

export type Pos = { idx: number; elapsed: number };

// Move forward by deltaMs. Carries over into following steps. Returns the single strongest cue.
export function advance(
  steps: { segments: Seg[] }[],
  pos: Pos,
  deltaMs: number,
  events: (i: number) => [number, Cue][],
): { pos: Pos; cue: Cue; finished: boolean } {
  let { idx, elapsed } = pos;
  let remainingDelta = Math.max(0, Math.round(deltaMs));
  const cues: Cue[] = [];
  while (true) {
    const total = stepMs(steps[idx]);
    const to = elapsed + remainingDelta;
    for (const [t, c] of events(idx)) if (t > elapsed && t <= to) cues.push(c);
    if (to < total) return { pos: { idx, elapsed: to }, cue: strongest(cues), finished: false };
    remainingDelta = to - total;
    if (idx + 1 >= steps.length) {
      return { pos: { idx: 0, elapsed: 0 }, cue: "done", finished: true };
    }
    idx += 1;
    elapsed = 0;
    cues.push(isPrep(steps[idx].segments[0]) ? "switch" : "start");
    if (remainingDelta === 0) return { pos: { idx, elapsed: 0 }, cue: strongest(cues), finished: false };
  }
}
