export type Phase = "work" | "rest";
export type Cue = "none" | "beep" | "start" | "rest" | "done";
export type TimerState = { phase: Phase; remaining: number; round: number };
export type Preset = { work: number; rest: number; rounds: number };

// One second passes. Returns the next state plus which sound cue (if any) to play.
export function tickTimer(s: TimerState, preset: Preset): { state: TimerState; cue: Cue; finished: boolean } {
  if (s.remaining > 1) {
    const remaining = s.remaining - 1;
    const length = s.phase === "work" ? preset.work : preset.rest;
    return { state: { ...s, remaining }, cue: remaining <= 3 && length > 5 ? "beep" : "none", finished: false };
  }
  if (s.phase === "work") {
    return { state: { phase: "rest", remaining: preset.rest, round: s.round }, cue: "rest", finished: false };
  }
  if (s.round >= preset.rounds) {
    return { state: { phase: "work", remaining: preset.work, round: 1 }, cue: "done", finished: true };
  }
  return { state: { phase: "work", remaining: preset.work, round: s.round + 1 }, cue: "start", finished: false };
}

export function tickWarmup(
  idx: number,
  remaining: number,
  secondsOf: (i: number) => number,
  count: number,
): { idx: number; remaining: number; cue: Cue; finished: boolean } {
  if (remaining > 1) {
    const r = remaining - 1;
    return { idx, remaining: r, cue: r <= 3 && secondsOf(idx) > 5 ? "beep" : "none", finished: false };
  }
  if (idx + 1 >= count) return { idx: 0, remaining: secondsOf(0), cue: "done", finished: true };
  return { idx: idx + 1, remaining: secondsOf(idx + 1), cue: "start", finished: false };
}
