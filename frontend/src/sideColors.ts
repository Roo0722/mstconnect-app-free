// Colour coding for guided routines, like a ship's lights: green = right (starboard), red = left (port),
// amber = rest / switch sides, blue = get ready. Anything else keeps the normal look.
export const SWITCH_LABEL = "Switch sides";
export const REST_LABEL = "Rest";

export type Look = { accent: string; tint: string };

const GREEN: Look = { accent: "#34d399", tint: "#0d3322" };
const RED: Look = { accent: "#ff6b5e", tint: "#40130f" };
const AMBER: Look = { accent: "#fbbf24", tint: "#3d2c06" };
const BLUE: Look = { accent: "#7db4ff", tint: "#0e2140" };

export const isSwitch = (label?: string) => label === SWITCH_LABEL;
export const isRestLabel = (label?: string) => label === REST_LABEL || label === SWITCH_LABEL;

export function segLook(label?: string): Look | null {
  if (!label) return null;
  if (label === "Get ready") return BLUE;
  if (isRestLabel(label)) return AMBER;
  if (/^right/i.test(label)) return GREEN;
  if (/^left/i.test(label)) return RED;
  return null;
}
