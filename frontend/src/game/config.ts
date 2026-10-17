// The MSTC training game: every number is a setting coaches can change (see RANKING.md in the Sarge project).
// This file is the only place the rules live; engine.ts reads them.

export const RULES = {
  rpPerMinute: 1,
  sessionCapMin: 90, // a session counts at most this many minutes
  minSessionMin: 10, // shorter than this is not a session
  mergeGapMin: 90, // activity less than this apart merges into one session
  weeklyMinCap: 360, // minutes per week that count toward RP
  questRP: 20,
  streakMinSessions: 3, // sessions in a week for a streak week
  streakRP: 10, // per streak week in a row...
  streakMaxRP: 50, // ...up to this much
  rpPerDivision: 120,
  carryOver: 0.25, // share of last season's RP that carries into the next
  promoSessions: 3, // qualifying sessions needed to move up a level
  promoWindowDays: 14,
  tzHours: 8, // Asia/Manila: weeks start Monday 00:00 and seasons are calendar quarters here
  maxLocalLevel: 6, // Levels 7 and 8 need verified sessions and the leaderboard (not on this phone alone)
} as const;

// Season RP needed to be eligible for each level (index 0 = Level 1).
export const THRESHOLDS = [0, 600, 1200, 1800, 2400, 3000, 4200, Infinity];

// Minutes each of the 3 promotion sessions must last, by the level being entered.
export const PROMO_MINUTES: Record<number, number> = { 2: 30, 3: 40, 4: 45, 5: 60, 6: 60, 7: 75, 8: 75 };

export type Rank = { level: number; name: string; role: string; profile: string; divisions: boolean };

export const RANKS: Rank[] = [
  { level: 1, name: "Novice Touch", divisions: true, role: "Fundamental kicks and juggling.",
    profile: "Stepping onto the court for the first time. Building foot-eye coordination, mastering the basic inside-foot touch (sepak sila), and learning how to keep the rattan ball alive." },
  { level: 2, name: "Steady Receiver", divisions: true, role: "Defensive backline reception.",
    profile: "A dependable defensive specialist. Stays calm under pressure, using thighs, chest, or head to absorb high-speed serves and deliver clean passes to the playmaker." },
  { level: 3, name: "Circle Marksman", divisions: true, role: "Precision service specialist.",
    profile: "Stationed in the service circle (lingkaran). Operates as the team's artillery, delivering fast, low-trajectory, and curving serves directly into the opponent's weak zones." },
  { level: 4, name: "Court Architect", divisions: true, role: "Playmaker and tosser.",
    profile: "The tactical brain in the front quarter-circles. Possesses a soft touch and high court vision, transforming chaotic defensive receptions into high, gentle tosses perfectly placed for the spiker." },
  { level: 5, name: "Net Striker", divisions: true, role: "Net blocking and overhead spikes.",
    profile: "An explosive front-court attacker. Dominates the net area with high leaping power, solid wall-like foot blocks, and thunderous overhead sunback spikes." },
  { level: 6, name: "Air Acrobat", divisions: false, role: "360-degree roll spike and horse-kick specialist.",
    profile: "An elite athlete with maxed-out aerial agility. Defies gravity by leaping, twisting mid-air, and executing full roll spikes or explosive kuda kicks over high net blocks." },
  { level: 7, name: "Regu Commander", divisions: false, role: "Tactical captain and court general.",
    profile: "A battle-tested veteran who reads opponent formations, controls match tempo, maintains team composure during high-stakes match points, and leads the regu to victory." },
  { level: 8, name: "Sovereign of Takraw", divisions: false, role: "All-position master and community mentor.",
    profile: "The top-tier court legend and community pillar. Master of all positions (Tekong, Feeder, and Striker), revered for supreme sportsmanship, tournament success, and guiding the next generation of players." },
];

export const DIVISION_NAMES = ["V", "IV", "III", "II", "I"]; // lowest first

export type Kind = "warmup" | "hiit" | "flex" | "other";
export const KIND_LABEL: Record<Kind, string> = { warmup: "Warm-up", hiit: "HIIT", flex: "Flexibility", other: "Training" };

export const QUESTS = [
  { id: "warm-train", title: "Warm up, then train", hint: "A warm-up and a HIIT round in one session" },
  { id: "flex", title: "Stretch it out", hint: "10 minutes of flexibility work this week" },
] as const;
