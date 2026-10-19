import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Switch, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { api } from "../api";
import { colors, radius, spacing } from "../theme";
import { EMBLEMS } from "../game/emblems";
import type { GameState } from "../game/engine";
import { useActivities } from "../game/store";
import {
  DAY_LETTERS, DAY_NAMES, MODE_ORDER, SESSION_LABEL, SESSION_ORDER, STARTER_DAYS, dayStart, parseTime, prettyTime, weekView,
  type DayView, type Mode, type Plan, type PlanEvent,
} from "./engine";
import { savePlan, usePlan } from "./store";
import { ensureReminderPermission, syncReminders } from "./notify";

const GREEN = "#34d399";
const RED = "#ff6b5e";
const YELLOW = colors.brandSecondary;

// ---------- data hooks ----------
export function useEventList(): PlanEvent[] {
  const q = useQuery({ queryKey: ["events-list"], queryFn: () => api.listEvents() as Promise<PlanEvent[]>, staleTime: 5 * 60_000 });
  return q.data ?? [];
}

export function usePlanWeek() {
  const { plan } = usePlan();
  const { activities } = useActivities();
  const events = useEventList();
  // recomputed when the plan, log or events change (and when the app comes back to the screen)
  return useMemo(() => {
    const now = Date.now();
    const trained = new Set(activities.map((a) => dayStart(a.end)));
    const week = weekView(plan, events, now);
    return { plan, week, trained, trainedToday: trained.has(dayStart(now)) };
  }, [plan, activities, events]);
}

// ---------- week strip (view only; used on Home) ----------
export function WeekStrip({ week, trained, plan }: { week: DayView[]; trained: Set<number>; plan: Plan }) {
  return (
    <View style={s.strip}>
      {week.map((d) => {
        const done = trained.has(d.ms);
        const event = d.events.length > 0;
        const train = d.plan.mode === "train" || d.plan.mode === "club";
        const num = String(new Date(d.ms + 8 * 3_600_000).getUTCDate());
        let bubble;
        if (done) {
          bubble = (
            <View style={[s.dot, { backgroundColor: GREEN }]}>
              <Ionicons name="checkmark" size={16} color="#0a0a0c" />
            </View>
          );
        } else if (event) {
          bubble = (
            <View style={[s.dot, { backgroundColor: YELLOW }]}>
              <Ionicons name="star" size={15} color="#0a0a0c" />
            </View>
          );
        } else if (train) {
          bubble = (
            <View style={[s.dot, { borderWidth: d.isToday ? 2 : 1, borderColor: "#e0362c", backgroundColor: d.isToday ? "#2a1311" : "transparent" }]}>
              <Text style={[s.dotText, { color: RED }]}>{num}</Text>
            </View>
          );
        } else {
          bubble = (
            <View style={[s.dot, { borderWidth: 1, borderStyle: "dashed", borderColor: "#3a3a44" }]}>
              <Text style={[s.dotText, { color: "#6c6c78", fontSize: 9, fontWeight: "700" }]}>{plan.set ? "rest" : num}</Text>
            </View>
          );
        }
        return (
          <View key={d.index} style={s.stripCol} accessibilityLabel={`${DAY_NAMES[d.index]}: ${done ? "trained" : event ? "MSTC event" : train ? "training day" : "rest"}`}>
            <Text style={[s.stripLetter, d.isToday && { color: colors.onSurface, fontWeight: "800" }]}>{DAY_LETTERS[d.index]}</Text>
            {bubble}
          </View>
        );
      })}
    </View>
  );
}

// ---------- today ----------
export function TodayCard({ week, plan, trainedToday }: { week: DayView[]; plan: Plan; trainedToday: boolean }) {
  const router = useRouter();
  const today = week.find((d) => d.isToday);
  if (!today) return null;
  const ev = today.events[0];
  const training = today.plan.mode === "train" || today.plan.mode === "club";
  const when = plan.set && training ? prettyTime(plan.time) : "";
  let eyebrow = "TODAY";
  let title = "No plan yet";
  let sub = "Pick your training days below, or tap 3-day starter.";
  let action: { label: string; go: () => void } | null = null;

  if (trainedToday) {
    eyebrow = "TODAY · DONE";
    title = "You trained today. Nice work.";
    sub = "Rest well. Recovery is part of training.";
  } else if (ev && today.plan.mode !== "train") {
    eyebrow = "TODAY · MSTC EVENT";
    title = ev.title;
    sub = ev.location ?? "Check the event page for details.";
  } else if (plan.set && today.plan.mode === "train") {
    eyebrow = "TODAY · TRAINING DAY";
    title = SESSION_LABEL[today.plan.session];
    sub = ev ? `MSTC event today too: ${ev.title}` : "";
    action =
      today.plan.session === "flex"
        ? { label: "Start flexibility", go: () => router.push("/tools/stretches") }
        : { label: "Start warm-up", go: () => router.push("/tools/warmup") };
  } else if (plan.set && today.plan.mode === "club") {
    eyebrow = "TODAY · CLUB SESSION";
    title = "Club training";
    sub = "Warm up first.";
    action = { label: "Start warm-up", go: () => router.push("/tools/warmup") };
  } else if (plan.set) {
    eyebrow = "TODAY · REST DAY";
    title = "Rest day";
    sub = "Recovery is part of training. Light stretching is fine.";
  }

  return (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <Text style={s.eyebrow}>{eyebrow}</Text>
        {when ? <Text style={s.muted}>{when}</Text> : null}
      </View>
      <Text style={s.cardTitle}>{title}</Text>
      {sub ? <Text style={s.muted}>{sub}</Text> : null}
      {action ? (
        <Pressable onPress={action.go} style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={s.ctaText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- plan editor ----------
const nextOf = <T,>(list: T[], v: T) => list[(list.indexOf(v) + 1) % list.length];

function Step({ icon, onStep, label }: { icon: "add" | "remove"; onStep: () => void; label: string }) {
  const step = useRef(onStep);
  step.current = onStep;
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loop = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeated = useRef(false);
  const stop = useCallback(() => {
    if (delay.current) clearTimeout(delay.current);
    if (loop.current) clearInterval(loop.current);
    delay.current = null;
    loop.current = null;
  }, []);
  useEffect(() => stop, [stop]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.step, pressed && { opacity: 0.6 }]}
      onPressIn={() => {
        repeated.current = false;
        stop();
        delay.current = setTimeout(() => {
          repeated.current = true;
          step.current();
          loop.current = setInterval(() => step.current(), 110);
        }, 400);
      }}
      onPressOut={stop}
      onPress={() => {
        if (!repeated.current) step.current();
      }}
    >
      <Ionicons name={icon} size={18} color={colors.onSurface} />
    </Pressable>
  );
}

export function PlanEditor({ week }: { week: DayView[] }) {
  const { plan } = usePlan();
  const [blocked, setBlocked] = useState(false);

  const update = async (next: Plan, askPermission = false) => {
    await savePlan({ ...next, set: true });
    if (askPermission && (next.remindersOn || next.eventsOn)) {
      const ok = await ensureReminderPermission();
      setBlocked(!ok);
    }
    syncReminders(false);
  };
  const setDay = (i: number, patch: Partial<Plan["days"][number]>) =>
    update({ ...plan, days: plan.days.map((d, k) => (k === i ? { ...d, ...patch } : d)) }, !plan.set);
  const minutes = (() => {
    const t = parseTime(plan.time);
    return t.h * 60 + t.min;
  })();
  const setMinutes = (m: number) => {
    const c = (m + 1440) % 1440;
    update({ ...plan, time: `${Math.floor(c / 60)}:${String(c % 60).padStart(2, "0")}` });
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={s.rowBetween}>
        <Text style={s.eyebrow}>MY WEEK</Text>
        <Pressable onPress={() => update({ ...plan, days: STARTER_DAYS.map((d) => ({ ...d })) }, true)} style={s.starter} accessibilityRole="button">
          <Text style={s.starterText}>3-day starter</Text>
        </Pressable>
      </View>
      <Text style={s.hint}>Tap a day to switch Train, Rest or Club. Tap the session name to change it. Training days are edited here.</Text>

      {week.map((d) => {
        const m = plan.days[d.index].mode;
        const palette: Record<Mode, { bg: string; border: string; chipBg: string; chipFg: string; label: string }> = {
          train: { bg: "#1c1210", border: "#e0362c", chipBg: "#e0362c", chipFg: "#fff", label: "Train" },
          rest: { bg: colors.surfaceSecondary, border: colors.border, chipBg: "#26262e", chipFg: "#9a9aa5", label: "Rest" },
          club: { bg: "#1d1a08", border: YELLOW, chipBg: YELLOW, chipFg: "#0a0a0c", label: "Club" },
        };
        const p = palette[m];
        const ev = d.events[0];
        return (
          <View key={d.index} style={[s.dayRow, { backgroundColor: p.bg, borderColor: d.isToday ? colors.onSurface : p.border }]}>
            <Text style={[s.dayName, m === "rest" && { color: "#9a9aa5" }]}>{DAY_NAMES[d.index]}</Text>
            <Pressable
              onPress={() => setDay(d.index, { mode: nextOf(MODE_ORDER, m) })}
              style={[s.chip, { backgroundColor: p.chipBg }]}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_NAMES[d.index]}: ${p.label}. Tap to change.`}
            >
              <Text style={[s.chipText, { color: p.chipFg }]}>{p.label}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              {m === "train" ? (
                <Pressable onPress={() => setDay(d.index, { session: nextOf(SESSION_ORDER, plan.days[d.index].session) })} hitSlop={6} accessibilityRole="button">
                  <Text style={s.session}>{SESSION_LABEL[plan.days[d.index].session]}</Text>
                </Pressable>
              ) : m === "club" ? (
                <Text style={s.session}>Club training</Text>
              ) : (
                <Text style={[s.session, { color: "#7a7a86" }]}>Recovery day</Text>
              )}
              {ev ? (
                <Text style={s.eventLine} numberOfLines={1}>
                  ★ {ev.title}
                </Text>
              ) : null}
            </View>
            {m === "train" ? <Text style={s.time}>{prettyTime(plan.time)}</Text> : null}
          </View>
        );
      })}

      <View style={s.panel}>
        <View style={s.optRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.optTitle}>Training reminders</Text>
            <Text style={s.hint}>On your training days</Text>
          </View>
          <Switch
            value={plan.remindersOn}
            onValueChange={(v) => update({ ...plan, remindersOn: v }, v)}
            trackColor={{ true: YELLOW }}
            accessibilityLabel="Training reminders"
          />
        </View>
        {plan.remindersOn ? (
          <View style={[s.optRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[s.optTitle, { flex: 1 }]}>Reminder time</Text>
            <Step icon="remove" label="Earlier" onStep={() => setMinutes(minutes - 15)} />
            <Text style={s.timeBig}>{prettyTime(plan.time)}</Text>
            <Step icon="add" label="Later" onStep={() => setMinutes(minutes + 15)} />
          </View>
        ) : null}
        <View style={[s.optRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.optTitle}>Add MSTC events to my plan</Text>
            <Text style={s.hint}>Reminder the evening before, and 1 hour ahead</Text>
          </View>
          <Switch value={plan.eventsOn} onValueChange={(v) => update({ ...plan, eventsOn: v }, v)} trackColor={{ true: YELLOW }} accessibilityLabel="Add MSTC events to my plan" />
        </View>
      </View>

      {blocked ? (
        <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
          <Text style={[s.hint, { color: RED }]}>Notifications are blocked for MSTConnect. Tap here to open Android settings and allow them.</Text>
        </Pressable>
      ) : null}
      <Text style={s.hint}>Reminders don't arrive? Some phones block them in battery saver. Turn off battery optimization for MSTConnect.</Text>
    </View>
  );
}

// ---------- share the rank as a picture ----------
export const ShareCard = forwardRef<View, { g: GameState }>(function ShareCard({ g }, ref) {
  const name = `${g.rankName}${g.division ? ` ${g.division}` : ""}`;
  return (
    <View ref={ref} collapsable={false} style={s.share}>
      <Text style={s.shareBrand}>MSTCONNECT</Text>
      <Image source={EMBLEMS[g.level - 1]} style={s.shareEmblem} contentFit="contain" priority="high" cachePolicy="memory-disk" />
      <Text style={s.shareLevel}>LEVEL {g.level} OF 8</Text>
      <Text style={s.shareName}>{name}</Text>
      <View style={s.shareChips}>
        <View style={s.shareChip}>
          <Text style={s.shareChipText}>{g.rawRP.toLocaleString()} RP this season</Text>
        </View>
        {g.week.streakWeeks > 0 ? (
          <View style={s.shareChip}>
            <Text style={s.shareChipText}>Streak {g.week.streakWeeks} {g.week.streakWeeks === 1 ? "week" : "weeks"}</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.shareFoot}>Malitbog Sepak Takraw Community</Text>
    </View>
  );
});

export async function shareRankPicture(cardRef: React.RefObject<View | null>, g: GameState) {
  try {
    if (cardRef.current && (await Sharing.isAvailableAsync())) {
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share my rank" });
      return;
    }
  } catch {
    // fall through to a plain text share
  }
  const name = `${g.rankName}${g.division ? ` ${g.division}` : ""}`;
  Share.share({ message: `I'm ${name} on MSTConnect (${g.rawRP.toLocaleString()} RP, ${g.seasonSpan}). Train with the Malitbog Sepak Takraw Community!` }).catch(() => {});
}

const s = StyleSheet.create({
  strip: { flexDirection: "row", justifyContent: "space-between" },
  stripCol: { flex: 1, alignItems: "center", gap: 5 },
  stripLetter: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: 11, fontWeight: "800" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  hint: { color: colors.finePrint, fontSize: 11, lineHeight: 16 },
  cardTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  cta: { backgroundColor: colors.brandPrimary, borderRadius: radius.pill, minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 4 },
  ctaText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  starter: { backgroundColor: YELLOW, borderRadius: radius.pill, minHeight: 36, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  starterText: { color: "#0a0a0c", fontSize: 12, fontWeight: "800" },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minHeight: 50 },
  dayName: { width: 34, color: colors.onSurface, fontSize: 14, fontWeight: "900" },
  chip: { borderRadius: 999, paddingHorizontal: 10, minHeight: 32, alignItems: "center", justifyContent: "center", minWidth: 58 },
  chipText: { fontSize: 11, fontWeight: "800" },
  session: { color: "#d6d6de", fontSize: 12 },
  eventLine: { color: YELLOW, fontSize: 11, fontWeight: "700", marginTop: 1 },
  time: { color: RED, fontSize: 12, fontWeight: "800" },
  panel: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginTop: 4 },
  optRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 54, paddingVertical: 6 },
  optTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  timeBig: { color: YELLOW, fontSize: 14, fontWeight: "800", minWidth: 72, textAlign: "center" },
  share: { width: 342, backgroundColor: "#14120a", borderWidth: 1, borderColor: YELLOW, borderRadius: 22, paddingTop: 22, paddingBottom: 18, paddingHorizontal: 20, alignItems: "center" },
  shareBrand: { color: YELLOW, fontSize: 11, fontWeight: "900", letterSpacing: 3 },
  shareEmblem: { width: 300, height: 230, marginTop: 10 },
  shareLevel: { color: "#9a9aa5", fontSize: 11, fontWeight: "800", letterSpacing: 1.6 },
  shareName: { color: "#f5f5f5", fontSize: 30, fontWeight: "900", marginTop: 4, textAlign: "center" },
  shareChips: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap", justifyContent: "center" },
  shareChip: { backgroundColor: "#1f1f26", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  shareChipText: { color: "#f5f5f5", fontSize: 12, fontWeight: "700" },
  shareFoot: { color: "#b8b8c2", fontSize: 12, marginTop: 16 },
});
