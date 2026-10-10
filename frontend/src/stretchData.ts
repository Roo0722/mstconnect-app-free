// Advanced stretches. Edit this file to change wording or hold times.
// Every stretch starts with an 8 s "Get ready" so you can settle into position.
import type { Segment } from "./warmupData";

export type Stretch = {
  name: string;
  position: string;
  targets: string;
  cues: string[];
  easier: string;
  segments: Segment[];
};

export const SAFETY = "Hold gently, no bouncing, stop at sharp pain. Best done after training or on rest days, never cold.";
const ready: Segment = { label: "Get ready", seconds: 8 };
const sides = (s: number): Segment[] => [ready, { label: "Right side", seconds: s }, { label: "Left side", seconds: s }];

export const STRETCHES: Stretch[] = [
  { name: "Butterfly", position: "Sit tall with the soles of your feet together and knees dropped out to the sides.",
    targets: "Inner thighs (adductors), groin, hips.",
    cues: ["Hold your feet and keep your back long.", "Let the knees fall slowly; do not push them down.", "Hinge forward from the hips only as far as is comfortable.", "Breathe slowly."],
    easier: "Sit on a folded towel or cushion and keep your feet further from your body.",
    segments: [ready, { label: "Hold", seconds: 60 }] },
  { name: "Seated Straddle", position: "Sit with your legs open wide in a V, knees and toes pointing up.",
    targets: "Inner thighs, hamstrings, lower back.",
    cues: ["Sit tall first, then hinge forward from the hips.", "Walk your hands forward in front of you.", "Keep the knees pointing to the ceiling.", "Stop where you feel a steady stretch."],
    easier: "Bring the legs closer together and sit on a cushion.",
    segments: [ready, { label: "Hold", seconds: 60 }] },
  { name: "Seated Single-Leg Hamstring", position: "Sit with one leg straight and the other foot resting against your inner thigh.",
    targets: "Back of the thigh (hamstring) and calf of the straight leg.",
    cues: ["Sit tall and hinge forward over the straight leg.", "Reach toward your shin or foot, not necessarily your toes.", "Keep the straight knee soft, not locked."],
    easier: "Loop a towel or strap around the foot and keep the back straight.",
    segments: sides(45) },
  { name: "Front Split", position: "Kneel in a long lunge, front leg straight with heel on the floor and back knee down.",
    targets: "Hamstrings of the front leg, hip flexors of the back leg.",
    cues: ["Keep hips square, facing forward.", "Slide the front foot forward slowly only as far as is comfortable.", "Rest your hands on the floor or on blocks or cushions for support.", "Keep your chest tall."],
    easier: "Stay in a half split: back knee down, front leg straight, hips over the back knee.",
    segments: sides(45) },
  { name: "Middle Split", position: "Sit or stand with your legs wide apart, toes pointing up (seated) or forward.",
    targets: "Inner thighs (adductors), groin, hamstrings.",
    cues: ["Open your legs only as wide as is comfortable.", "Support your weight with your hands in front of you.", "Keep your knees and toes pointing up.", "Breathe slowly and relax into it."],
    easier: "Use a wall for support, or place cushions under your hips.",
    segments: [ready, { label: "Hold", seconds: 60 }] },
];
