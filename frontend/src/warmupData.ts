// The warm-up routine. Edit this file to change steps, wording or timing.
//
// Each step is made of one or more "segments". A segment lasts `seconds` and may have:
//   reps  – the segment is split into that many equal reps; a soft tick marks each new rep
//   beat  – (instead of reps) a soft tick every `beat` seconds, for marching / rhythm work
// Segments with a `label` (e.g. "Right side") show as pills and play a gentle "switch" tone.
// Keep rep lengths slow (2 s or more) so the rhythm stays gentle and easy to follow.

export type Segment = { label?: string; seconds: number; reps?: number; beat?: number };
export type WarmupStep = {
  name: string;
  phase: "Raise" | "Neck & shoulders" | "Arms & trunk" | "Legs & hips" | "Ball prep";
  purpose?: string;
  details: string[];
  segments: Segment[];
};

const side = (seconds: number, reps?: number): Segment[] => [
  { label: "Right side", seconds, reps },
  { label: "Left side", seconds, reps },
];

export const WARMUP: WarmupStep[] = [
  { name: "Light March / Jog in Place", phase: "Raise", purpose: "Raise your heart rate and body temperature.",
    details: ["March or jog lightly on the spot.", "Swing your arms easily.", "Stay relaxed; tick = one step."],
    segments: [{ seconds: 120, beat: 2 }] },
  { name: "Cervical Rotation Stretch (Active Neck Rotation)", phase: "Neck & shoulders",
    details: ["Look straight ahead.", "Turn your head to the right, return to center and pause.", "Turn to the left, return to center and pause.", "Right + left = one rep."],
    segments: [{ seconds: 48, reps: 8 }] },
  { name: "Neck Flexion & Extension", phase: "Neck & shoulders",
    details: ["Lower your chin toward your chest, hold briefly, return to center.", "Look up gently, hold briefly, return to center.", "Never force the movement."],
    segments: [{ seconds: 48, reps: 6 }] },
  { name: "Head Rotations", phase: "Neck & shoulders",
    details: ["Roll your head in slow, small half-circles.", "Keep shoulders down and relaxed."],
    segments: [{ seconds: 36, reps: 6 }] },
  { name: "Levator Scapulae Stretch", phase: "Neck & shoulders",
    details: ["Turn your head about 45° and look down toward your armpit.", "Gently ease the head down. Hold, then switch sides."],
    segments: side(20) },
  { name: "Upper Trapezius Stretch", phase: "Neck & shoulders",
    details: ["Tilt your ear toward your shoulder (about 90°).", "Keep the opposite shoulder low. Hold, then switch sides."],
    segments: side(20) },
  { name: "Shoulder & Arm Circles", phase: "Neck & shoulders", purpose: "Loosen the shoulders.",
    details: ["10 circles forward, then 10 circles backward.", "Make them big, smooth and slow."],
    segments: [{ label: "Forward", seconds: 30, reps: 10 }, { label: "Backward", seconds: 30, reps: 10 }] },
  { name: "Cross-Body Shoulder Stretch", phase: "Arms & trunk",
    details: ["Bring one arm across your chest.", "Hold it with the other arm. Hold, then switch sides."],
    segments: side(20) },
  { name: "Triceps Stretch", phase: "Arms & trunk",
    details: ["Raise one arm and bend the elbow behind your head.", "Gently press the elbow with the other hand. Hold, then switch sides."],
    segments: side(20) },
  { name: "Chest and Biceps Opener Stretch", phase: "Arms & trunk",
    details: ["Interlace your fingers behind your back.", "Straighten the arms and lift them slightly.", "Open the chest. Hold."],
    segments: [{ seconds: 20 }] },
  { name: "Trunk Rotations", phase: "Arms & trunk",
    details: ["Feet shoulder-width apart, hips facing forward.", "Rotate your upper body slowly, 10 reps per side."],
    segments: side(30, 10) },
  { name: "Ankle Rotations", phase: "Legs & hips", purpose: "Keep your ankles stable.",
    details: ["Lift one foot and circle the ankle slowly.", "8 circles each direction, both feet."],
    segments: [
      { label: "Right: clockwise", seconds: 16, reps: 8 }, { label: "Right: counter", seconds: 16, reps: 8 },
      { label: "Left: clockwise", seconds: 16, reps: 8 }, { label: "Left: counter", seconds: 16, reps: 8 }] },
  { name: "Basic Calf Raises", phase: "Legs & hips",
    details: ["Feet straight. Rise onto your toes, lower slowly.", "20 reps."], segments: [{ seconds: 40, reps: 20 }] },
  { name: "Internal Rotation Calf Raises", phase: "Legs & hips",
    details: ["Toes pointing inward, heels apart.", "Rise and lower slowly. 20 reps."], segments: [{ seconds: 40, reps: 20 }] },
  { name: "External Rotation Calf Raises", phase: "Legs & hips",
    details: ["Heels inward with toes outward.", "Rise and lower slowly. 20 reps."], segments: [{ seconds: 40, reps: 20 }] },
  { name: "High Knee March", phase: "Legs & hips",
    details: ["March, lifting each knee toward hip height.", "Stand tall; tick = one step."], segments: [{ seconds: 60, beat: 1.5 }] },
  { name: "Hip Openers", phase: "Legs & hips",
    details: ["Lift the knee, open it out to the side, and lower.", "10 reps per side."], segments: side(40, 10) },
  { name: "Lateral Lunges (Groin Focus)", phase: "Legs & hips",
    details: ["Step wide, sit back over one leg, keep the other leg straight.", "Chest up. 10 reps per side."], segments: side(40, 10) },
  { name: "World's Greatest Dynamic Stretch", phase: "Legs & hips",
    details: ["Lunge forward, elbow toward the instep, rotate and reach up.", "Do the reps on one side, then switch."], segments: side(36, 6) },
  { name: "Leg Swings", phase: "Legs & hips",
    details: ["Hold something for balance.", "Swing the leg forward and back, 10 each leg."], segments: side(30, 10) },
  { name: "Controlled Kicks", phase: "Ball prep",
    details: ["Kick low and under control, building height slowly.", "10 per side."], segments: side(30, 10) },
  { name: "Alternating Ball Touches", phase: "Ball prep",
    details: ["Soft touches, right foot then left.", "Keep a calm, steady rhythm."], segments: [{ seconds: 90, beat: 2 }] },
  { name: "Soft Landing Taps", phase: "Ball prep", purpose: "Quiet landings and good balance.",
    details: ["Small hops, landing softly and quietly.", "Bend knees and hips on every landing."], segments: [{ seconds: 90, beat: 2 }] },
  { name: "Transition into Basic Ball Work", phase: "Ball prep",
    details: ["Start your basic ball work at an easy pace.", "Slowly build up to normal speed."], segments: [{ seconds: 90 }] },
];
