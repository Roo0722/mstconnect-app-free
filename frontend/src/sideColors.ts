// Colour coding for guided routines.
//   side:      green = right (starboard), red = left (port)
//   direction: sky blue = forward / down, violet = back / up, pink = sideways
//   rest:      amber (rest and "switch sides")      get ready: calm slate
// When a segment has both a side and a direction (e.g. "Right · forward") the background follows the side
// and the big text follows the direction. Anything else keeps the normal look.
export const SWITCH_LABEL = "Switch sides";
export const REST_LABEL = "Rest";
export const READY_LABEL = "Get ready";

export type Look = { accent: string; tint: string };

const RIGHT: Look = { accent: "#34d399", tint: "#0d3322" };
const LEFT: Look = { accent: "#ff6b5e", tint: "#40130f" };
const FORWARD: Look = { accent: "#38bdf8", tint: "#0b2a40" };
const BACK: Look = { accent: "#a78bfa", tint: "#26184a" };
const SIDEWAYS: Look = { accent: "#f472b6", tint: "#40122b" };
const AMBER: Look = { accent: "#fbbf24", tint: "#3d2c06" };
const READY: Look = { accent: "#cbd5e1", tint: "#1b2430" };

export const isSwitch = (label?: string) => label === SWITCH_LABEL;
export const isRestLabel = (label?: string) => label === REST_LABEL || label === SWITCH_LABEL;

function sideOf(label: string): Look | null {
  if (/^right\b/i.test(label)) return RIGHT;
  if (/^left\b/i.test(label)) return LEFT;
  return null;
}
function dirOf(label: string): Look | null {
  if (/\b(sideways|side-to-side|lateral)\b/i.test(label)) return SIDEWAYS;
  if (/\b(forward|front|down)\b/i.test(label)) return FORWARD;
  if (/\b(back|backward|up)\b/i.test(label)) return BACK;
  return null;
}

export function segLook(label?: string | null): Look | null {
  if (!label) return null;
  if (label === READY_LABEL) return READY;
  if (isRestLabel(label)) return AMBER;
  const side = sideOf(label);
  const dir = dirOf(label);
  if (side && dir) return { accent: dir.accent, tint: side.tint };
  return side ?? dir;
}
