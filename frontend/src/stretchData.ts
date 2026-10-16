// Flexibility & kicking mobility routine. Edit this file to change wording, sets or timing.
// Every exercise starts with an 8 s "Get ready" so you can settle into position.
// Segments: "Set 1 / Set 2" hold or rep blocks, with a short "Rest" between sets where it is not a side change.
import type { Segment } from "./warmupData";

export type Stretch = {
  name: string;
  prescription: string; // shown on the list card, e.g. "2 × 20-30 s"
  position: string;
  targets: string;
  cues: string[];
  easier: string;
  segments: Segment[];
};

export const SAFETY =
  "Do this after a proper dynamic warm-up, never cold. Mild-to-moderate tension only: no bouncing, no forcing splits. Stop at sharp groin or hamstring pain, hip pinching or numbness.";

export const RULES = [
  "Do this routine after a proper dynamic warm-up, not while your muscles are cold.",
  "Keep static stretches at a mild-to-moderate tension. No bouncing or forcing splits.",
  "Don't chase maximum flexibility right before a match; use dynamic movements and controlled kicks before playing.",
  "Stop if you feel sharp groin pain, hamstring pain, hip pinching, or numbness.",
  "Flexibility alone doesn't guarantee a higher or safer spike. Technique, strength, balance and progressive sport-specific practice are essential.",
];

export const PLAN_NOTE =
  "Use this as a separate flexibility session after practice or on suitable training days, 2 to 4 times a week depending on recovery. Before games, stick to the warm-up and finish with progressively faster, controlled ball work.";

export const PROGRESSION: { weeks: string; goal: string }[] = [
  { weeks: "Weeks 1-2", goal: "Learn correct positions and build tolerance without pain." },
  { weeks: "Weeks 3-4", goal: "Gradually increase comfortable range and active leg-raise height." },
  { weeks: "Weeks 5-8", goal: "Improve control and hold times; progress split depth only if comfortable." },
  { weeks: "Week 8+", goal: "Maintain mobility and bring it into controlled kicking drills." },
];
export const PROGRESSION_NOTE =
  "These are general guidelines, not guaranteed timelines. Progress depends on training history, recovery, anatomy and consistency.";

const ready: Segment = { label: "Get ready", seconds: 8 };
const rest = (seconds: number): Segment => ({ label: "Rest", seconds });
// two sets of one hold
const twoSets = (hold: number, restS = 10): Segment[] => [ready, { label: "Set 1", seconds: hold }, rest(restS), { label: "Set 2", seconds: hold }];
// two sets, one block per leg, alternating legs
const twoSetsSides = (seconds: number, reps?: number): Segment[] => [
  ready,
  { label: "Right · set 1", seconds, reps },
  { label: "Left · set 1", seconds, reps },
  { label: "Right · set 2", seconds, reps },
  { label: "Left · set 2", seconds, reps },
];

export const STRETCHES: Stretch[] = [
  { name: "Butterfly Stretch", prescription: "2 × 25 s",
    position: "Sit tall with the soles of your feet together and knees dropped out to the sides.",
    targets: "Inner thighs and groin.",
    cues: ["Hold your feet and keep your back long.", "Let the knees relax outward. Avoid pushing them down.", "Hinge forward from the hips only as far as is comfortable.", "Breathe slowly."],
    easier: "Sit on a folded towel or cushion and keep your feet further from your body.",
    segments: twoSets(25) },
  { name: "Seated Straddle Stretch", prescription: "2 × 25 s",
    position: "Sit with your legs open in a comfortable V, knees and toes pointing up.",
    targets: "Adductors and wide-kick range.",
    cues: ["Sit tall first, then hinge forward from the hips.", "Increase the width gradually over time.", "Keep the knees pointing to the ceiling.", "Stop where you feel a steady, mild stretch."],
    easier: "Bring the legs closer together and sit on a cushion.",
    segments: twoSets(25) },
  { name: "Seated Single-Leg Hamstring Stretch", prescription: "2 × 25 s per leg",
    position: "Sit with one leg straight and the other foot resting against your inner thigh.",
    targets: "Hamstrings and straight-leg kicking range.",
    cues: ["Keep your back comfortable and extend from the hips.", "No bouncing or pulling aggressively.", "Reach toward your shin or foot, not necessarily your toes.", "Keep the straight knee soft, not locked."],
    easier: "Loop a towel or strap around the foot and keep the back straight.",
    segments: twoSetsSides(25) },
  { name: "Active Straight-Leg Raises", prescription: "2 × 8 reps per leg",
    position: "Stand tall holding a wall or sturdy support, one leg slightly forward of the other.",
    targets: "Active flexibility and hip-flexor strength.",
    cues: ["Raise one straight leg in front of you, under control.", "Pause briefly at the top, then lower slowly.", "Stop before your pelvis tilts or you need to swing.", "Keep your standing leg and chest tall."],
    easier: "Raise the leg lower and keep the knee slightly bent.",
    segments: twoSetsSides(24, 8) },
  { name: "Supported Front Split Progression", prescription: "2 × 15 s per leg",
    position: "Kneel in a long lunge, front leg straight with heel on the floor and back knee down. Use sturdy supports.",
    targets: "Front-to-back hip and hamstring flexibility.",
    cues: ["Use a comfortable partial split with your hands on blocks, cushions or the floor.", "Keep hips square, facing forward.", "Lower gradually over weeks, not by forcing the position in one session.", "Keep your chest tall."],
    easier: "Stay in a half split: back knee down, front leg straight, hips over the back knee.",
    segments: twoSetsSides(15) },
  { name: "Supported Middle Split Progression", prescription: "2 × 15 s",
    position: "Sit or stand with your legs wide apart, toes pointing up (seated) or forward. Support yourself with your hands or blocks.",
    targets: "Inner-thigh flexibility and lateral range.",
    cues: ["Open your legs only as wide as is comfortable.", "Keep the movement gradual and avoid sliding into a painful position.", "Keep your knees and toes pointing up.", "Breathe slowly and relax into it."],
    easier: "Use a wall for support, or place cushions under your hips.",
    segments: twoSets(15) },
  { name: "Romanian Deadlift / Bodyweight Hip Hinge", prescription: "2 × 10 reps",
    position: "Stand with feet hip-width apart, knees slightly bent, a neutral back.",
    targets: "Hamstring strength and control at longer muscle lengths.",
    cues: ["Push your hips backward with a neutral back and slightly bent knees.", "Start with bodyweight or a light load.", "Lower slowly, then stand tall by squeezing the hips forward.", "Use controlled repetitions."],
    easier: "Hold a wall or chair for balance and make the movement smaller.",
    segments: [ready, { label: "Set 1", seconds: 30, reps: 10 }, rest(15), { label: "Set 2", seconds: 30, reps: 10 }] },
];
