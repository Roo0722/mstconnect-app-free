import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, LayoutAnimation } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { useActivityTracker } from "../../src/game/useTracker";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { cue, preloadSounds } from "../../src/sound";
import { FullScreenTimer } from "../../src/FullScreenTimer";
import { STRETCHES, SAFETY, RULES, PLAN_NOTE, PROGRESSION, PROGRESSION_NOTE } from "../../src/stretchData";
import { advance, displayKey, stepEvents, stepMs, type Pos } from "../../src/warmupEngine";
import { moment } from "../../src/routineView";

const EVENTS = STRETCHES.map((s) => stepEvents(s));
const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function StretchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [full, setFull] = useState(false);
  const [running, setRunning] = useState(false);
  useActivityTracker("flex", running);
  const [pos, setPos] = useState<Pos>({ idx: 0, elapsed: 0 });
  const [open, setOpen] = useState<number | null>(null);
  const posRef = useRef(pos);
  useKeepAwake("mstc-stretches");
  useEffect(() => preloadSounds(), []);

  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = Math.min(500, now - last);
      last = now;
      // one stretch at a time: stop when it finishes
      const r = advance([STRETCHES[posRef.current.idx]], { idx: 0, elapsed: posRef.current.elapsed }, delta, () => EVENTS[posRef.current.idx]);
      const p = { idx: posRef.current.idx, elapsed: r.finished ? 0 : r.pos.elapsed };
      const prev = posRef.current;
      posRef.current = p;
      // the engine ticks 10x a second; only redraw when something on screen changes
      if (r.finished || displayKey(STRETCHES[p.idx], p.idx, p.elapsed) !== displayKey(STRETCHES[prev.idx], prev.idx, prev.elapsed)) setPos(p);
      cue(r.cue);
      if (r.finished) {
        setRunning(false);
        setFull(false);
      }
    }, 100);
    return () => {
      clearInterval(id);
      setPos(posRef.current); // when paused, show exactly where we stopped
    };
  }, [running]);

  const begin = (idx: number) => {
    const p = { idx, elapsed: 0 };
    posRef.current = p;
    setPos(p);
    setFull(true);
    setRunning(true);
    cue("start");
  };

  const st = STRETCHES[pos.idx];
  const total = stepMs(st);
  const m = moment(st, pos.elapsed, { readyBadge: "GET INTO POSITION", holdWord: "HOLD GENTLY" });
  const lines = m.getReady
    ? [st.position, st.easier]
    : m.switching
      ? [m.nextSeg ? `Next: ${m.nextSeg.label}` : "Switch sides", "Reset your position and breathe."]
      : m.pause
        ? ["Shake out, breathe slowly.", "Next set starts soon."]
        : st.cues;

  if (full) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullScreenTimer
          eyebrow={`FLEXIBILITY ${pos.idx + 1} / ${STRETCHES.length}`}
          title={st.name}
          big={fmt(m.leftMs)}
          cueWord={m.cueWord}
          badge={m.badge}
          then={m.then}
          pills={m.pills}
          lines={lines}
          purpose={m.getReady || m.pause ? undefined : SAFETY}
          progress={pos.elapsed / total}
          nextUp={null}
          accent={m.look?.accent}
          tint={m.look?.tint}
          urgent={m.urgent}
          running={running}
          onToggle={() => setRunning((v) => !v)}
          onClose={() => {
            setRunning(false);
            setFull(false);
          }}
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Flexibility & Kicking Mobility</Text>
          <Text style={styles.subtitle}>{STRETCHES.length} exercises · 2 sets each · after training or on rest days</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.safety}>
          <Ionicons name="warning-outline" size={18} color={colors.brandSecondary} />
          <Text style={styles.safetyText}>{SAFETY}</Text>
        </View>
        {STRETCHES.map((s, i) => {
          const isOpen = open === i;
          return (
            <Pressable key={s.name} style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setOpen(isOpen ? null : i);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.time}>{s.prescription}</Text>
              </View>
              <Text style={styles.targets}>Targets: {s.targets}</Text>
              {isOpen ? (
                <View style={{ marginTop: spacing.sm, gap: 4 }}>
                  <Text style={styles.label}>POSITION</Text>
                  <Text style={styles.detail}>{s.position}</Text>
                  <Text style={styles.label}>HOW TO</Text>
                  {s.cues.map((c, k) => (
                    <Text key={k} style={styles.detail}>• {c}</Text>
                  ))}
                  <Text style={styles.label}>EASIER OPTION</Text>
                  <Text style={styles.detail}>{s.easier}</Text>
                  <Pressable style={styles.start} onPress={() => begin(i)}>
                    <Ionicons name="play" size={16} color={colors.onBrandPrimary} />
                    <Text style={styles.startText}>Start timer</Text>
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        <Text style={styles.section}>PROGRESSION PLAN</Text>
        <View style={styles.card}>
          {PROGRESSION.map((p) => (
            <View key={p.weeks} style={styles.planRow}>
              <Text style={styles.planWeeks}>{p.weeks}</Text>
              <Text style={styles.planGoal}>{p.goal}</Text>
            </View>
          ))}
          <Text style={styles.targets}>{PROGRESSION_NOTE}</Text>
        </View>
        <Text style={styles.section}>IMPORTANT RULES</Text>
        <View style={styles.card}>
          {RULES.map((r, k) => (
            <Text key={k} style={styles.detail}>• {r}</Text>
          ))}
        </View>
        <Text style={styles.planNote}>{PLAN_NOTE}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.88 },
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  safety: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  safetyText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flex: 1, color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  time: { color: colors.brandSecondary, fontSize: 13, fontWeight: "800" },
  targets: { color: colors.muted, fontSize: 13, marginTop: 4 },
  section: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6, marginTop: spacing.lg, marginBottom: spacing.sm },
  planRow: { flexDirection: "row", gap: spacing.sm, marginBottom: 6 },
  planWeeks: { width: 78, color: colors.brandSecondary, fontSize: 12, fontWeight: "800" },
  planGoal: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  planNote: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  label: { color: colors.brandSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginTop: 8 },
  detail: { color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  start: { flexDirection: "row", gap: 6, alignSelf: "flex-start", alignItems: "center", backgroundColor: colors.brandPrimary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, marginTop: spacing.md },
  startText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "800" },
});
