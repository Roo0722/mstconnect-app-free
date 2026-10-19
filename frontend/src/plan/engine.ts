// The weekly training plan and its reminders. Pure functions: no phone APIs here, so they are easy to test.
// All dates use Philippine time (UTC+8), the same as MSTC events.
export type Mode = "train" | "rest" | "club";
export type Session = "warmup-hiit" | "flex" | "free";
export type DayPlan = { mode: Mode; session: Session };
export type Plan = {
  set: boolean; // false until the player saves a plan once
  days: DayPlan[]; // Monday first
  time: string; // "17:30", one reminder time for all training days
  remindersOn: boolean;
  eventsOn: boolean; // add MSTC events to the plan, with reminders
};

export const SESSION_LABEL: Record<Session, string> = { "warmup-hiit": "Warm-up + HIIT", flex: "Flexibility", free: "Free training" };
export const SESSION_ORDER: Session[] = ["warmup-hiit", "flex", "free"];
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
export const MODE_ORDER: Mode[] = ["train", "rest", "club"];

export const rest = (): DayPlan => ({ mode: "rest", session: "free" });
export const DEFAULT_PLAN: Plan = { set: false, days: Array.from({ length: 7 }, rest), time: "17:30", remindersOn: true, eventsOn: true };
export const STARTER_DAYS: DayPlan[] = [
  { mode: "train", session: "warmup-hiit" },
  rest(),
  { mode: "train", session: "flex" },
  rest(),
  { mode: "train", session: "warmup-hiit" },
  rest(),
  rest(),
];

const H = 3_600_000;
const D = 24 * H;
const PH = 8 * H;

// Manila calendar parts of a moment. weekday: Monday = 0.
export function manila(ms: number) {
  const d = new Date(ms + PH);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), weekday: (d.getUTCDay() + 6) % 7 };
}
// Moment for a Manila date and clock time.
export const manilaMs = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m, d, h, min) - PH;
export const dayStart = (ms: number) => {
  const p = manila(ms);
  return manilaMs(p.y, p.m, p.d);
};
export const weekStart = (ms: number) => dayStart(ms) - manila(ms).weekday * D;

export function parseTime(t: string): { h: number; min: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  const h = m ? Math.min(23, Number(m[1])) : 17;
  const min = m ? Math.min(59, Number(m[2])) : 30;
  return { h, min };
}
export const formatClock = (h: number, min: number) => `${((h + 11) % 12) + 1}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
export const prettyTime = (t: string) => {
  const { h, min } = parseTime(t);
  return formatClock(h, min);
};

export type PlanEvent = { id: string; title: string; location?: string | null; starts_at?: string | null; created_at?: string; date?: string | null; past?: boolean };

// An event's day (start of day, Manila) and exact start, when known.
export function eventWhen(e: PlanEvent): { day: number; start: number | null } | null {
  if (e.starts_at) {
    const t = Date.parse(e.starts_at);
    if (!Number.isNaN(t)) return { day: dayStart(t), start: t };
  }
  if (e.date && e.created_at) {
    const t = Date.parse(e.created_at);
    if (!Number.isNaN(t) && t > 0) return { day: dayStart(t), start: null };
  }
  return null;
}

export type DayView = { index: number; ms: number; plan: DayPlan; events: PlanEvent[]; isToday: boolean; isPast: boolean };

// The seven days of the week that contains `now`, with MSTC events placed on their days.
export function weekView(plan: Plan, events: PlanEvent[], now: number): DayView[] {
  const ws = weekStart(now);
  const today = dayStart(now);
  return Array.from({ length: 7 }, (_, i) => {
    const ms = ws + i * D;
    const evs = plan.eventsOn
      ? events.filter((e) => !e.past && eventWhen(e)?.day === ms).sort((a, b) => (eventWhen(a)!.start ?? 0) - (eventWhen(b)!.start ?? 0))
      : [];
    return { index: i, ms, plan: plan.days[i] ?? rest(), events: evs, isToday: ms === today, isPast: ms < today };
  });
}

export type Reminder = { key: string; title: string; body: string; at: number; kind: "training" | "event"; eventId?: string };

const HORIZON_DAYS = 21;
const MAX_REMINDERS = 40;

export function buildReminders(args: {
  plan: Plan;
  events: PlanEvent[] | null; // null = couldn't load events, so leave event reminders alone
  now: number;
  trainedToday: boolean;
  serverReminders: boolean; // the push Worker already sends the 1-hour event reminder
}): Reminder[] {
  const { plan, events, now, trainedToday, serverReminders } = args;
  const out: Reminder[] = [];
  const today = dayStart(now);

  if (plan.remindersOn && plan.set) {
    const { h, min } = parseTime(plan.time);
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const day = today + i * D;
      const p = plan.days[manila(day).weekday];
      if (!p || p.mode !== "train") continue;
      const at = day + h * H + min * 60_000;
      if (at <= now) continue;
      if (i === 0 && trainedToday) continue; // already trained today: no reminder
      out.push({
        key: `t-${day}`,
        kind: "training",
        at,
        title: "Training time",
        body: p.session === "flex" ? "Time for your flexibility session." : p.session === "warmup-hiit" ? "Start with your warm-up, then HIIT." : "Time to train. Start with your warm-up.",
      });
    }
  }

  if (events && plan.eventsOn) {
    for (const e of events) {
      if (e.past) continue;
      const w = eventWhen(e);
      if (!w) continue;
      const where = e.location ? ` · ${e.location}` : "";
      const clock = w.start !== null ? ` ${formatClock(manila(w.start).h, manila(w.start).min)}` : "";
      const evening = w.day - D + 19 * H; // 7:00 PM the evening before
      const push = (at: number, title: string, body: string, k: string) => {
        if (at > now && at < today + (HORIZON_DAYS + 7) * D) out.push({ key: `e-${e.id}-${k}`, kind: "event", eventId: e.id, at, title, body });
      };
      push(evening, `Tomorrow: ${e.title}`, `${w.start !== null ? clock.trim() : "Time to be confirmed"}${where}`, "eve");
      if (w.start !== null) {
        if (!serverReminders) push(w.start - H, `In 1 hour: ${e.title}`, `${clock.trim()}${where}`, "hr");
      } else {
        push(w.day + 7 * H, `Today: ${e.title}`, `Time to be confirmed${where}`, "am");
      }
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_REMINDERS);
}

// An event the player was told about that has since moved to "Past events" before it started: it was cancelled.
export function cancelledEvents(events: PlanEvent[], known: Record<string, string>, now: number): PlanEvent[] {
  return events.filter((e) => {
    if (!e.past || !known[e.id]) return false;
    const w = eventWhen(e);
    return !!w && (w.start ?? w.day + D) > now;
  });
}

export function cleanPlan(raw: any): Plan {
  const base = DEFAULT_PLAN;
  if (!raw || typeof raw !== "object") return base;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = raw.days?.[i];
    const mode: Mode = MODE_ORDER.includes(d?.mode) ? d.mode : "rest";
    const session: Session = SESSION_ORDER.includes(d?.session) ? d.session : "free";
    return { mode, session };
  });
  return {
    set: !!raw.set,
    days,
    time: typeof raw.time === "string" && /^\d{1,2}:\d{2}$/.test(raw.time) ? raw.time : base.time,
    remindersOn: raw.remindersOn !== false,
    eventsOn: raw.eventsOn !== false,
  };
}
