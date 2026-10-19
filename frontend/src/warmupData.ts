// The warm-up routine. Edit this file to change steps, wording or timing.
//
// Each step is made of one or more "segments". A segment lasts `seconds` and may have:
//   reps  – the segment is split into that many equal reps; a soft tick marks each new rep
//   beat  – (instead of reps) a soft tick every `beat` seconds, for marching / rhythm work
// Segments with a `label` (e.g. "Right side") show as pills and play a gentle "switch" tone.
// Keep rep lengths slow (2 s or more) so the rhythm stays gentle and easy to follow.

export type Segment = { label?: string; seconds: number; reps?: number; beat?: number; cycle?: string[] };
export type WarmupPhase =
  | "Raise body temperature"
  | "Upper body & trunk mobility"
  | "Ankle, calf & hip preparation"
  | "Sepak takraw preparation";
export type WarmupStep = {
  name: string;
  noPrep?: boolean; // skip the "Get ready" gap in front of this step (used for the final rest)
  phase: WarmupPhase;
  purpose?: string;
  details: string[];
  segments: Segment[];
};

// A short pause when changing sides, so each side is done with good quality.
const SWITCH_SECONDS = 4;
const swap: Segment = { label: "Switch sides", seconds: SWITCH_SECONDS };
const side = (seconds: number, reps?: number): Segment[] => [
  { label: "Right side", seconds, reps },
  swap,
  { label: "Left side", seconds, reps },
];

// Safety notes shown at the bottom of the warm-up list.
export const WARMUP_SAFETY = [
  "You should feel warmer, more mobile and ready, not exhausted.",
  "Keep neck movements gentle and avoid full circular neck rolls.",
  "Stop any movement that causes sharp pain, pinching or increasing discomfort.",
  "Increase kick height, speed and jumping intensity gradually.",
  "If you are already warm from earlier activity, shorten the early stages rather than rushing the sport-specific preparation.",
];

const R = "Raise body temperature" as const;
const U = "Upper body & trunk mobility" as const;
const A = "Ankle, calf & hip preparation" as const;
const S = "Sepak takraw preparation" as const;

export const WARMUP: WarmupStep[] = [
  // Phase 1: raise body temperature
  { name: "Light March / Jog in Place", phase: R, purpose: "Raise your heart rate and body temperature.",
    details: ["Start slowly, then increase the pace until you feel warmer.", "Swing your arms easily.", "Stay relaxed; tick = one step."],
    segments: [{ seconds: 60, beat: 2 }] },
  { name: "Cervical Rotation Stretch", phase: R,
    details: ["Turn your head gently, right then left, taking turns.", "Return to center and pause between turns.", "Avoid forcing the neck."],
    segments: [{ seconds: 24, reps: 8, cycle: ["Right", "Left"] }] },
  { name: "Neck Flexion & Extension", phase: R,
    details: ["Lower your chin toward your chest, then look up gently, taking turns.", "Stay within a comfortable range.", "Never force the movement."],
    segments: [{ seconds: 24, reps: 8, cycle: ["Down", "Up"] }] },

  // Phase 2: upper body and trunk mobility
  { name: "Levator Scapulae Stretch", phase: U,
    details: ["Turn your head about 45° to the side and look down toward your armpit.", "Stretch is felt at the back of the neck, opposite side. Light tension only. Hold, then switch sides."],
    segments: side(10) },
  { name: "Upper Trapezius Stretch", phase: U,
    details: ["Tilt your ear toward the same-side shoulder, keeping both shoulders down.", "Stretch is felt along the opposite side of the neck. Skip if uncomfortable."],
    segments: side(10) },
  { name: "Shoulder & Arm Circles", phase: U, purpose: "Loosen the shoulders.",
    details: ["Start with small circles and gradually make them bigger.", "Forward first, then backward."],
    segments: [{ label: "Forward", seconds: 10, reps: 4 }, { label: "Backward", seconds: 10, reps: 4 }] },
  { name: "Cross-Body Shoulder Stretch", phase: U,
    details: ["Bring one arm across your chest.", "Keep the shoulder relaxed; don't pull aggressively.", "Hold, then switch sides."],
    segments: side(10) },
  { name: "Triceps Stretch", phase: U,
    details: ["Raise one arm and bend the elbow behind your head.", "Gently press the elbow with the other hand. Hold, then switch sides."],
    segments: side(10) },
  { name: "Chest and Biceps Opener", phase: U,
    details: ["Interlace your fingers behind your back.", "Use controlled arm openings instead of long holds."],
    segments: [{ seconds: 20, reps: 5 }] },
  { name: "Trunk Rotations", phase: U,
    details: ["Feet shoulder-width apart, hips facing forward.", "Rotate smoothly without twisting forcefully."],
    segments: side(10, 4) },

  // Phase 3: ankle, calf and hip preparation
  { name: "Ankle Rotations", phase: A, purpose: "Keep your ankles stable.",
    details: ["Lift one foot and circle the ankle slowly.", "Move through a comfortable range."],
    segments: [{ label: "Right ankle", seconds: 10, reps: 5 }, swap, { label: "Left ankle", seconds: 10, reps: 5 }] },
  { name: "Basic Calf Raises", phase: A,
    details: ["Feet straight. Rise onto your toes, lower slowly.", "Rise and lower under control. About 8 reps."],
    segments: [{ seconds: 24, reps: 8 }] },
  { name: "Toes-In Calf Raises", phase: A,
    details: ["Toes slightly inward, knees aligned comfortably.", "Rise and lower slowly. About 8 reps."],
    segments: [{ seconds: 24, reps: 8 }] },
  { name: "Toes-Out Calf Raises", phase: A,
    details: ["Toes slightly outward without forcing the ankles.", "Rise and lower slowly. About 8 reps."],
    segments: [{ seconds: 24, reps: 8 }] },
  { name: "High Knee March", phase: A,
    details: ["Lift the knees progressively higher.", "Keep your balance; tick = one step."],
    segments: [{ seconds: 25, beat: 1.5 }] },
  { name: "Hip Openers", phase: A,
    details: ["Walk, lift one knee, rotate it outward to the side, then set the foot down and step forward.", "Open each hip smoothly without forcing the range."],
    segments: side(12, 4) },
  { name: "Lateral Lunges", phase: A,
    details: ["Step wide, sit back over one leg, keep the other leg straight.", "Keep it shallow at first and go a little deeper each rep. 4 reps per side."],
    segments: side(12, 4) },
  { name: "World's Greatest Dynamic Stretch", phase: A,
    details: ["Lunge forward, elbow toward the instep, rotate and reach up.", "Move smoothly. 3 reps per side."],
    segments: side(21, 3) },

  // Phase 4: sepak takraw preparation
  { name: "Leg Swings", phase: S,
    details: ["Hold a support if needed.", "Begin with small swings and increase gradually.", "Each leg: swing forward, then backward, then sideways (across your body)."],
    segments: [
      { label: "Right · forward", seconds: 12, reps: 5 }, { label: "Right · back", seconds: 12, reps: 5 }, { label: "Right · sideways", seconds: 12, reps: 5 }, swap,
      { label: "Left · forward", seconds: 12, reps: 5 }, { label: "Left · back", seconds: 12, reps: 5 }, { label: "Left · sideways", seconds: 12, reps: 5 }] },
  { name: "Controlled Kicks", phase: S,
    details: ["Low (about knee height), then middle (about waist), then high (a comfortable height).", "2 kicks at each height, right leg first, then left.", "Stay controlled; no maximum-height kicks yet."],
    segments: [
      { label: "Right · low", seconds: 6, reps: 2 }, { label: "Right · middle", seconds: 6, reps: 2 }, { label: "Right · high", seconds: 6, reps: 2 }, swap,
      { label: "Left · low", seconds: 6, reps: 2 }, { label: "Left · middle", seconds: 6, reps: 2 }, { label: "Left · high", seconds: 6, reps: 2 }] },
  { name: "Alternating Ball Touches", phase: S,
    details: ["Alternate feet with light, controlled contacts.", "Keep a calm, steady rhythm."],
    segments: [{ seconds: 30, beat: 2 }] },
  { name: "Soft Landing Taps", phase: S, purpose: "Quiet landings and good balance.",
    details: ["Low-impact small hops, landing quietly.", "Knees comfortably bent. Avoid repeated high jumps."],
    segments: [{ seconds: 18, reps: 6 }] },
  { name: "Transition into Basic Ball Work", phase: S,
    details: ["Start with easy passing and control.", "Progress to quicker, more game-like exchanges."],
    segments: [{ seconds: 60 }] },
  { name: "Rest, then Training", phase: S, noPrep: true, purpose: "The warm-up is done. Get ready for training (HIIT).",
    details: ["Rest and breathe slowly.", "Drink some water and shake out your legs.", "When the timer ends, you are ready to train."],
    segments: [{ label: "Rest", seconds: 30 }] },
];
