import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, Alert, LayoutAnimation } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { format } from "date-fns";
import { colors, spacing, radius } from "../src/theme";
import { BackgroundGlow } from "../src/BackgroundGlow";
import { KIND_LABEL, PROMO_MINUTES, RANKS, RULES, THRESHOLDS, type Kind } from "../src/game/config";
import { clearAll, logManual, useGame } from "../src/game/store";
import type { GameState } from "../src/game/engine";

const KINDS: Kind[] = ["warmup", "hiit", "flex", "other"];

function Bar({ value, color = colors.brandSecondary }: { value: number; color?: string }) {
  const v = useRef(new Animated.Value(Math.max(0, Math.min(1, value)))).current;
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, value)), duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [value]);
  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { backgroundColor: color, transform: [{ scaleX: v }] }]} />
    </View>
  );
}

const rangeText = (level: number) => {
  const lo = THRESHOLDS[level - 1];
  const hi = THRESHOLDS[level];
  return hi === Infinity ? `${lo.toLocaleString()}+ RP` : `${lo.toLocaleString()} to ${(hi - 1).toLocaleString()} RP`;
};

function daysLeft(ms: number) {
  return Math.max(0, Math.ceil((ms - Date.now()) / 86_400_000));
}

function RankCard({ g }: { g: GameState }) {
  const rank = RANKS[g.level - 1];
  const frac = g.divisionSize ? g.within / g.divisionSize : 1;
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <Text style={styles.eyebrow}>LEVEL {g.level} OF 8</Text>
        <Text style={styles.eyebrow}>{g.seasonSpan.toUpperCase()}</Text>
      </View>
      <Text style={styles.rankName} accessibilityRole="header">
        {g.rankName}{g.division ? ` ${g.division}` : ""}
      </Text>
      <Text style={styles.role}>{rank.role}</Text>

      {g.division ? (
        <>
          <Bar value={frac} />
          <View style={styles.rowBetween}>
            <Text style={styles.small}>{g.held ? "Division bar full" : `${g.within} / ${g.divisionSize} RP in this division`}</Text>
            <Text style={styles.small}>{g.rawRP.toLocaleString()} RP this season</Text>
          </View>
        </>
      ) : (
        <Text style={styles.small}>{g.rawRP.toLocaleString()} RP this season</Text>
      )}

      {g.series ? (
        <View style={styles.promo}>
          <Text style={styles.promoTitle}>PROMOTION TO {RANKS[g.series.toLevel - 1].name.toUpperCase()}</Text>
          <View style={styles.pips}>
            {Array.from({ length: g.series.needed }).map((_, i) => (
              <View key={i} style={[styles.pip, i < g.series!.count && styles.pipOn]}>
                {i < g.series!.count ? <Ionicons name="checkmark" size={14} color="#0a0a0c" /> : null}
              </View>
            ))}
            <Text style={styles.promoCount}>{g.series.count} / {g.series.needed}</Text>
          </View>
          <Text style={styles.small}>
            Train {g.series.needed} sessions of at least {g.series.minMinutes} minutes, each on a different day, within {RULES.promoWindowDays} days
            {g.series.windowEnd ? ` (until ${format(new Date(g.series.windowEnd), "d MMM")})` : ""}. Your points keep counting meanwhile.
          </Text>
        </View>
      ) : g.capped ? (
        <Text style={styles.note}>
          Highest rank this phone can reach on its own. Regu Commander needs verified sessions, which arrive with the shared leaderboard.
        </Text>
      ) : g.nextRank && g.nextAt ? (
        <Text style={styles.note}>
          {Math.max(0, g.nextAt - g.rawRP)} RP to unlock the {g.nextRank} promotion ({PROMO_MINUTES[g.level + 1]}-minute sessions).
        </Text>
      ) : null}
      {g.carry > 0 ? <Text style={styles.small}>Carried in from last season: {g.carry} RP</Text> : null}
    </View>
  );
}

function WeekCard({ g }: { g: GameState }) {
  const w = g.week;
  const left = Math.max(0, w.sessionsNeeded - w.sessions);
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>THIS WEEK</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.big}>{w.minutes} <Text style={styles.bigUnit}>min</Text></Text>
        <Text style={styles.small}>{w.sessions} {w.sessions === 1 ? "session" : "sessions"} · cap {w.cap} min</Text>
      </View>
      <Bar value={w.minutes / w.cap} color={colors.brandPrimary} />
      <View style={styles.streakRow}>
        <Ionicons name="flame" size={16} color={w.streakReached ? colors.brandSecondary : colors.muted} />
        <Text style={styles.small}>
          {w.streakReached
            ? `Streak week ${w.streakWeeks}. Nice.`
            : `${left} more ${left === 1 ? "session" : "sessions"} this week for a streak bonus${w.streakWeeks > 0 ? ` (streak: ${w.streakWeeks})` : ""}`}
        </Text>
      </View>
      <View style={{ gap: 8, marginTop: spacing.sm }}>
        {w.quests.map((q) => (
          <View key={q.id} style={styles.quest}>
            <Ionicons name={q.done ? "checkmark-circle" : "ellipse-outline"} size={22} color={q.done ? "#34d399" : colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.questTitle, q.done && { opacity: 0.6 }]}>{q.title}</Text>
              <Text style={styles.small}>{q.hint}</Text>
            </View>
            <Text style={[styles.questRP, q.done && { opacity: 0.6 }]}>+{RULES.questRP} RP</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LogCard() {
  const [kind, setKind] = useState<Kind>("hiit");
  const [mins, setMins] = useState(30);
  const [msg, setMsg] = useState("");
  const submit = async () => {
    await logManual(kind, mins);
    setMsg(`Logged ${mins} minutes of ${KIND_LABEL[kind].toLowerCase()}.`);
  };
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>LOG A SESSION</Text>
      <Text style={styles.small}>Trained without the app? Add it here. Timer, warm-up and flexibility sessions are logged for you.</Text>
      <View style={styles.chips}>
        {KINDS.map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="button" accessibilityState={{ selected: kind === k }} style={[styles.chip, kind === k && styles.chipOn]}>
            <Text style={[styles.chipText, kind === k && styles.chipTextOn]}>{KIND_LABEL[k]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={() => setMins((m) => Math.max(10, m - 5))} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="5 minutes less">
          <Ionicons name="remove" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.stepVal} accessibilityLiveRegion="polite">{mins} min</Text>
        <Pressable onPress={() => setMins((m) => Math.min(90, m + 5))} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="5 minutes more">
          <Ionicons name="add" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]} onPress={submit} accessibilityRole="button">
        <Text style={styles.ctaText}>Log session</Text>
      </Pressable>
      {msg ? <Text style={styles.ok}>{msg}</Text> : null}
    </View>
  );
}

function Recent({ g }: { g: GameState }) {
  if (!g.recent.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>RECENT SESSIONS</Text>
        <Text style={styles.small}>Nothing yet. Start the Warm-Up Guide, the HIIT timer or the Flexibility routine and your minutes appear here. A session needs at least {RULES.minSessionMin} minutes to count.</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>RECENT SESSIONS</Text>
      {g.recent.map((s, i) => (
        <View key={s.start} style={[styles.sess, i > 0 && styles.sessDivider]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessTitle}>{s.kinds.map((k) => KIND_LABEL[k]).join(" + ")}</Text>
            <Text style={styles.small}>
              {format(new Date(s.start), "EEE d MMM, h:mm a")} · {Math.round(s.minutes)} min
              {s.counts && s.credited < s.minutes ? " (weekly cap reached)" : ""}
            </Text>
          </View>
          {s.counts ? (
            <Text style={styles.sessRP}>+{s.rp} RP</Text>
          ) : (
            <Text style={styles.small}>too short</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function Ladder({ g }: { g: GameState }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>THE EIGHT RANKS</Text>
      {RANKS.map((r) => {
        const done = r.level < g.level;
        const cur = r.level === g.level;
        const locked = r.level > RULES.maxLocalLevel;
        const isOpen = open === r.level;
        return (
          <Pressable
            key={r.level}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOpen(isOpen ? null : r.level);
            }}
            style={({ pressed }) => [styles.ladderRow, cur && styles.ladderCur, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.ladderTop}>
              <View style={[styles.lvl, cur && { backgroundColor: colors.brandSecondary }, done && { backgroundColor: "#34d399" }]}>
                {done ? <Ionicons name="checkmark" size={14} color="#0a0a0c" /> : <Text style={[styles.lvlText, cur && { color: "#0a0a0c" }]}>{r.level}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ladderName, locked && { opacity: 0.6 }]}>{r.name}</Text>
                <Text style={styles.small}>{r.level === 7 ? "4,200+ RP and 8 verified sessions" : r.level === 8 ? "Top slots among Regu Commanders" : rangeText(r.level)}</Text>
              </View>
              {locked ? <Ionicons name="lock-closed" size={16} color={colors.muted} /> : null}
            </View>
            {isOpen ? (
              <View style={{ marginTop: spacing.sm, gap: 4 }}>
                <Text style={styles.profileLabel}>CORE ROLE</Text>
                <Text style={styles.profile}>{r.role}</Text>
                <Text style={styles.profileLabel}>PLAYER PROFILE</Text>
                <Text style={styles.profile}>{r.profile}</Text>
                {locked ? <Text style={styles.note}>Needs verified sessions and the shared leaderboard, coming later.</Text> : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { game: g } = useGame();

  const confirmClear = () =>
    Alert.alert("Clear training data?", "This deletes your training log and rank progress from this phone. It cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => clearAll() },
    ]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Training Log & Rank</Text>
          <Text style={styles.subtitle}>{g.seasonSpan} · {daysLeft(g.seasonEndsAt)} days left in the season</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}>
        <RankCard g={g} />
        <WeekCard g={g} />
        <LogCard />
        <Recent g={g} />
        <Ladder g={g} />

        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOW IT WORKS</Text>
          <Text style={styles.small}>
            Every minute you train earns 1 rank point (RP), up to {RULES.sessionCapMin} minutes per session and {RULES.weeklyMinCap} minutes per week.
            Activity less than {RULES.mergeGapMin} minutes apart counts as one session, and a session needs {RULES.minSessionMin} minutes. Seasons last three months;
            you keep {Math.round(RULES.carryOver * 100)}% of your points into the next one. Resting is part of training, so there is no penalty for a
            quiet week, and one missed week per season will not break your streak.
          </Text>
          <Text style={[styles.small, { marginTop: 8 }]}>
            Your log is stored on this phone only. A shared leaderboard will be optional later.
          </Text>
          <Pressable onPress={confirmClear} style={styles.clear} accessibilityRole="button">
            <Text style={styles.clearText}>Clear my training data</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  hero: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.brandSecondary, gap: 8 },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  rankName: { color: colors.onSurface, fontSize: 30, fontWeight: "900" },
  role: { color: colors.muted, fontSize: 13 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden", marginTop: 4 },
  barFill: { height: 10, width: "100%", transformOrigin: "left center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  note: { color: colors.onSurface, fontSize: 13, lineHeight: 19, marginTop: 4 },
  promo: { backgroundColor: "rgba(252, 209, 22, 0.10)", borderRadius: radius.md, padding: spacing.md, gap: 8, marginTop: 4 },
  promoTitle: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  pips: { flexDirection: "row", alignItems: "center", gap: 8 },
  pip: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  pipOn: { backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary },
  promoCount: { color: colors.onSurface, fontSize: 14, fontWeight: "800", marginLeft: 4 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardLabel: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  big: { color: colors.onSurface, fontSize: 30, fontWeight: "900" },
  bigUnit: { fontSize: 14, fontWeight: "700", color: colors.muted },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  quest: { flexDirection: "row", alignItems: "center", gap: 10 },
  questTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  questRP: { color: colors.brandSecondary, fontSize: 12, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: "#0a0a0c" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg, marginTop: 4 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  stepVal: { color: colors.onSurface, fontSize: 22, fontWeight: "900", minWidth: 96, textAlign: "center", fontVariant: ["tabular-nums"] },
  cta: { backgroundColor: colors.brandPrimary, borderRadius: radius.lg, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  ctaText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "900" },
  ok: { color: "#34d399", fontSize: 13, fontWeight: "700" },
  sess: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  sessDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  sessTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  sessRP: { color: colors.brandSecondary, fontSize: 14, fontWeight: "900" },
  ladderRow: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.md },
  ladderCur: { backgroundColor: "rgba(252, 209, 22, 0.08)" },
  ladderTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  lvl: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  lvlText: { color: colors.onSurface, fontSize: 12, fontWeight: "900" },
  ladderName: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  profileLabel: { color: colors.brandSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginTop: 6 },
  profile: { color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  clear: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 8 },
  clearText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800" },
});
