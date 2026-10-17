// Pure rules engine for the training game. No React, no storage: give it the activity log, get the state.
import { DIVISION_NAMES, PROMO_MINUTES, QUESTS, RANKS, RULES, THRESHOLDS, type Kind } from "./config";

export type Activity = { id: string; kind: Kind; start: number; end: number; minutes: number; manual?: boolean; detail?: string };

export type Session = {
  start: number;
  end: number;
  minutes: number; // active minutes, capped per session
  credited: number; // minutes that counted after the weekly cap
  rp: number; // base + quest + streak
  bonus: { quests: string[]; streak: number };
  kinds: Kind[];
  counts: boolean; // false when shorter than the minimum
};

const MIN = 60_000;
const DAY = 86_400_000;
const HOUR = 3_600_000;

// "Local" time = Asia/Manila. We shift by the offset and then read UTC fields.
const shift = (ms: number) => ms + RULES.tzHours * HOUR;
export function weekStart(ms: number) {
  const d = new Date(shift(ms));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow) - RULES.tzHours * HOUR;
}
export function dayKey(ms: number) {
  const d = new Date(shift(ms));
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}
export function seasonOf(ms: number) {
  const d = new Date(shift(ms));
  return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3); // sortable index
}
export const seasonLabel = (idx: number) => `Season ${Math.floor(idx / 4)} Q${(idx % 4) + 1}`;
const SEASON_MONTHS = ["Jan to Mar", "Apr to Jun", "Jul to Sep", "Oct to Dec"];
export const seasonSpan = (idx: number) => `${SEASON_MONTHS[idx % 4]} ${Math.floor(idx / 4)}`;
export function seasonEnd(idx: number) {
  const y = Math.floor(idx / 4);
  const q = idx % 4;
  return Date.UTC(y, q * 3 + 3, 1) - RULES.tzHours * HOUR; // first instant of the next quarter
}

export function levelFromRP(rp: number, max: number = RULES.maxLocalLevel) {
  let lvl = 1;
  for (let l = 1; l < max; l++) if (rp >= THRESHOLDS[l]) lvl = l + 1;
  return lvl;
}

// Merge activity into sessions: less than mergeGapMin apart = one session.
export function mergeSessions(acts: Activity[]): { start: number; end: number; minutes: number; kinds: Kind[]; acts: Activity[] }[] {
  const sorted = [...acts].filter((a) => a.minutes > 0).sort((a, b) => a.start - b.start);
  const out: { start: number; end: number; minutes: number; kinds: Kind[]; acts: Activity[] }[] = [];
  for (const a of sorted) {
    const last = out[out.length - 1];
    if (last && a.start - last.end < RULES.mergeGapMin * MIN) {
      last.end = Math.max(last.end, a.end);
      last.minutes += a.minutes;
      if (!last.kinds.includes(a.kind)) last.kinds.push(a.kind);
      last.acts.push(a);
    } else out.push({ start: a.start, end: a.end, minutes: a.minutes, kinds: [a.kind], acts: [a] });
  }
  return out;
}

export type Series = { count: number; needed: number; minMinutes: number; windowEnd: number | null; toLevel: number };

export type GameState = {
  now: number;
  season: number;
  seasonLabel: string;
  seasonSpan: string;
  seasonEndsAt: number;
  carry: number; // RP carried in from last season
  rawRP: number; // all RP this season
  level: number;
  rankName: string;
  division: string | null; // "V".."I" for levels 1-5
  within: number; // RP into the current division (or past the level start)
  divisionSize: number;
  held: boolean; // the bar is full and the promotion series is the gate
  series: Series | null;
  nextRank: string | null;
  nextAt: number | null;
  capped: boolean; // at the highest level this phone alone can reach
  lifetimeRP: number;
  sessionsThisSeason: number;
  week: {
    start: number;
    minutes: number; // credited minutes this week
    cap: number;
    sessions: number;
    quests: { id: string; title: string; hint: string; done: boolean }[];
    streakWeeks: number; // consecutive streak weeks including this one if reached
    streakReached: boolean;
    sessionsNeeded: number;
  };
  passAvailable: boolean;
  recent: Session[]; // newest first
  totalSessions: number;
  totalMinutes: number;
};

type Wk = { sessions: number; flex: number; questsDone: Set<string>; credited: number; reached: boolean };

export function computeGame(acts: Activity[], now: number): GameState {
  const merged = mergeSessions(acts);
  const sessions: (Session & { season: number; week: number })[] = [];

  // pass 1: cap, weekly cap, quests, streaks (chronological, week by week)
  const weeks = new Map<number, Wk>();
  const getWk = (w: number): Wk => {
    let v = weeks.get(w);
    if (!v) weeks.set(w, (v = { sessions: 0, flex: 0, questsDone: new Set(), credited: 0, reached: false }));
    return v;
  };
  let streak = 0;
  let lastWeekSeen: number | null = null;
  const passUsedIn = new Set<number>(); // seasons whose recovery pass is used
  const finishWeeks = (from: number, to: number, seasonIdx: number) => {
    // weeks strictly between lastWeek and `to` (exclusive of `to`) are finished; apply streak rules to each
    for (let w = from; w < to; w += 7 * DAY) {
      const wk = weeks.get(w);
      if (wk?.reached) continue; // already counted when reached
      if (streak > 0) {
        if (!passUsedIn.has(seasonIdx)) passUsedIn.add(seasonIdx); // recovery pass: streak survives
        else streak = 0;
      }
    }
  };

  for (const m of merged) {
    const counts = m.minutes >= RULES.minSessionMin;
    const s: Session & { season: number; week: number } = {
      start: m.start,
      end: m.end,
      minutes: Math.min(m.minutes, RULES.sessionCapMin),
      credited: 0,
      rp: 0,
      bonus: { quests: [], streak: 0 },
      kinds: m.kinds,
      counts,
      season: seasonOf(m.start),
      week: weekStart(m.start),
    };
    sessions.push(s);
    if (!counts) continue;
    if (lastWeekSeen !== null && s.week > lastWeekSeen) finishWeeks(lastWeekSeen, s.week, s.season);
    lastWeekSeen = s.week;
    const wk = getWk(s.week);
    wk.sessions += 1;
    s.credited = Math.max(0, Math.min(s.minutes, RULES.weeklyMinCap - wk.credited));
    wk.credited += s.credited;
    let rp = Math.round(s.credited * RULES.rpPerMinute);
    // quests
    if (!wk.questsDone.has("warm-train") && m.kinds.includes("warmup") && m.kinds.includes("hiit")) {
      wk.questsDone.add("warm-train");
      s.bonus.quests.push("warm-train");
      rp += RULES.questRP;
    }
    wk.flex += m.acts.filter((a) => a.kind === "flex").reduce((t, a) => t + a.minutes, 0);
    if (!wk.questsDone.has("flex") && wk.flex >= 10) {
      wk.questsDone.add("flex");
      s.bonus.quests.push("flex");
      rp += RULES.questRP;
    }
    // streak: the week reaches streak status on its 3rd session
    if (!wk.reached && wk.sessions >= RULES.streakMinSessions) {
      wk.reached = true;
      streak += 1;
      const b = Math.min(streak * RULES.streakRP, RULES.streakMaxRP);
      s.bonus.streak = b;
      rp += b;
    }
    s.rp = rp;
  }

  // weeks between the last session week and now that are already over also count against the streak
  const thisWeek = weekStart(now);
  if (lastWeekSeen !== null && thisWeek > lastWeekSeen) finishWeeks(lastWeekSeen, thisWeek, seasonOf(now));
  const wkNow = weeks.get(thisWeek);
  const streakNow = wkNow?.reached ? streak : streak; // streak already includes this week if reached

  // pass 2: per season, with carry-over and promotion series
  const counted = sessions.filter((s) => s.counts);
  const first = counted.length ? counted[0].season : seasonOf(now);
  const cur = seasonOf(now);
  let carry = 0;
  let prevTotal = 0;
  let result = { raw: 0, level: 1, series: null as Series | null, carry: 0, sessionsInSeason: 0 };
  let lifetime = 0;
  for (let sIdx = first; sIdx <= cur; sIdx++) {
    carry = Math.round(prevTotal * RULES.carryOver);
    let raw = carry;
    let level = levelFromRP(carry);
    let count = 0;
    let days: number[] = [];
    let windowStart: number | null = null;
    const inSeason = counted.filter((s) => s.season === sIdx);
    for (const s of inSeason) {
      raw += s.rp;
      lifetime += s.rp;
      // promotion: while the bar for the next level is full, this session may count toward the series
      let moved = true;
      while (moved && level < RULES.maxLocalLevel) {
        moved = false;
        if (raw >= THRESHOLDS[level]) {
          const need = PROMO_MINUTES[level + 1];
          const day = dayKey(s.start);
          if (s.minutes >= need && !days.includes(day)) {
            if (windowStart === null || s.start > windowStart + RULES.promoWindowDays * DAY) {
              windowStart = s.start;
              days = [day];
            } else days.push(day);
            if (days.length >= RULES.promoSessions) {
              level += 1;
              days = [];
              windowStart = null;
              moved = false; // the next level needs its own series: later sessions only
            }
          }
        }
      }
    }
    // series display for the current state
    let series: Series | null = null;
    if (level < RULES.maxLocalLevel && raw >= THRESHOLDS[level]) {
      const expired = windowStart !== null && sIdx === cur && now > windowStart + RULES.promoWindowDays * DAY;
      series = {
        count: expired ? 0 : days.length,
        needed: RULES.promoSessions,
        minMinutes: PROMO_MINUTES[level + 1],
        windowEnd: expired || windowStart === null ? null : windowStart + RULES.promoWindowDays * DAY,
        toLevel: level + 1,
      };
    }
    result = { raw, level, series, carry, sessionsInSeason: inSeason.length };
    prevTotal = raw;
  }

  const rank = RANKS[result.level - 1];
  const next = result.level < RULES.maxLocalLevel ? RANKS[result.level] : null;
  const held = !!result.series;
  const ceiling = result.level < RULES.maxLocalLevel ? THRESHOLDS[result.level] - 1 : Infinity;
  const shownRP = Math.min(result.raw, ceiling);
  const levelStart = THRESHOLDS[result.level - 1];
  let division: string | null = null;
  let within = shownRP - levelStart;
  let divisionSize: number = RULES.rpPerDivision;
  if (rank.divisions) {
    const idx = Math.min(DIVISION_NAMES.length - 1, Math.floor(within / RULES.rpPerDivision));
    division = DIVISION_NAMES[idx];
    within = held ? RULES.rpPerDivision : within - idx * RULES.rpPerDivision;
  } else {
    divisionSize = 0;
  }

  const questList = QUESTS.map((q) => ({ id: q.id, title: q.title, hint: q.hint, done: !!wkNow?.questsDone.has(q.id) }));
  const recent = [...sessions].sort((a, b) => b.start - a.start).slice(0, 12);

  return {
    now,
    season: cur,
    seasonLabel: seasonLabel(cur),
    seasonSpan: seasonSpan(cur),
    seasonEndsAt: seasonEnd(cur),
    carry: result.carry,
    rawRP: result.raw,
    level: result.level,
    rankName: rank.name,
    division,
    within,
    divisionSize,
    held,
    series: result.series,
    nextRank: next?.name ?? null,
    nextAt: next ? THRESHOLDS[result.level] : null,
    capped: result.level >= RULES.maxLocalLevel,
    lifetimeRP: lifetime,
    sessionsThisSeason: result.sessionsInSeason,
    week: {
      start: thisWeek,
      minutes: Math.round(wkNow?.credited ?? 0),
      cap: RULES.weeklyMinCap,
      sessions: wkNow?.sessions ?? 0,
      quests: questList,
      streakWeeks: streakNow,
      streakReached: !!wkNow?.reached,
      sessionsNeeded: RULES.streakMinSessions,
    },
    passAvailable: !passUsedIn.has(cur),
    recent,
    totalSessions: counted.length,
    totalMinutes: Math.round(counted.reduce((t, s) => t + s.minutes, 0)),
  };
}
