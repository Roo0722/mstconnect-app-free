// Turns "where are we in this exercise?" into what the full-screen timer shows.
// One place for the wording, colours and countdown rules, shared by the warm-up and the flexibility routine.
import { isPrep, locate, stepMs, type Seg, type Where } from "./warmupEngine";
import { isRestLabel, isSwitch, segLook, type Look } from "./sideColors";
import type { Pill } from "./FullScreenTimer";

export type Moment = {
  w: Where;
  cur: Seg;
  getReady: boolean;
  pause: boolean; // a "Switch sides" pause or a rest
  switching: boolean;
  look: Look | null;
  leftMs: number; // what the big countdown shows
  cueWord?: string;
  badge?: string;
  then?: string;
  urgent: boolean;
  pills?: Pill[];
  nextSeg?: Seg;
};

const segMs = (g: Seg) => Math.round(g.seconds * 1000);

export function moment(
  step: { segments: Seg[] },
  elapsed: number,
  opts: { readyBadge?: string; holdWord?: string; followedByPrep?: boolean } = {},
): Moment {
  const w = locate(step, elapsed);
  const cur = step.segments[w.seg];
  const getReady = isPrep(cur);
  const switching = isSwitch(cur.label);
  const pause = isRestLabel(cur.label);
  const curLabel = w.cyc ?? cur.label ?? null;
  const look = segLook(curLabel);
  const total = stepMs(step);
  const segEnd = step.segments.slice(0, w.seg + 1).reduce((a, g) => a + segMs(g), 0);
  // "Get ready" and pauses count down on their own; otherwise the time left in the exercise
  const leftMs = getReady || pause ? segEnd - elapsed : total - elapsed;

  const nextSeg = step.segments[w.seg + 1];
  const then = nextSeg
    ? isSwitch(nextSeg.label)
      ? "Then: switch sides"
      : nextSeg.label
        ? `Then: ${nextSeg.label}`
        : undefined
    : undefined;

  const badge = getReady
    ? (opts.readyBadge ?? "GET READY")
    : switching
      ? "SWITCH SIDES"
      : pause
        ? "REST"
        : w.rep
          ? `REP ${w.rep} / ${w.reps}`
          : cur.beat
            ? "FOLLOW THE BEAT"
            : w.hold
              ? (opts.holdWord ?? "HOLD")
              : undefined;

  const urgent =
    leftMs > 0 && leftMs <= 3000 && (getReady || (!pause && total > 5000 && !opts.followedByPrep));

  const shown = step.segments.map((g, i) => ({ g, i })).filter((x) => !isPrep(x.g) && !isSwitch(x.g.label));
  const pills: Pill[] | undefined = shown.some((x) => x.g.label)
    ? shown.map(({ g, i }) => ({ label: g.label ?? "", state: i < w.seg ? "done" : i === w.seg ? "current" : "todo" }))
    : undefined;

  return {
    w,
    cur,
    getReady,
    pause,
    switching,
    look,
    leftMs,
    cueWord: !getReady && !pause && curLabel ? curLabel.toUpperCase() : undefined,
    badge,
    then: getReady || !pause ? then : undefined,
    urgent,
    pills,
    nextSeg,
  };
}
