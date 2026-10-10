import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { cue } from "../../src/sound";
import { FullScreenTimer, type Pill } from "../../src/FullScreenTimer";
import { STRETCHES, SAFETY } from "../../src/stretchData";
import { advance, locate, stepEvents, stepMs, type Pos } from "../../src/warmupEngine";

const EVENTS = STRETCHES.map(stepEvents);
const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function StretchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [full, setFull] = useState(false);
  const [running, setRunning] = useState(false);
  const [pos, setPos] = useState<Pos>({ idx: 0, elapsed: 0 });
  const [open, setOpen] = useState<number | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  useKeepAwake("mstc-stretches");

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
      posRef.current = p;
      setPos(p);
      cue(r.cue);
      if (r.finished) {
        setRunning(false);
        setFull(false);
      }
    }, 100);
    return () => clearInterval(id);
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
  const w = locate(st, pos.elapsed);
  const total = stepMs(st);
  const isReady = st.segments[w.seg].label === "Get ready";
  const pills: Pill[] = st.segments.map((g, i) => ({ label: g.label ?? "", state: i < w.seg ? "done" : i === w.seg ? "current" : "todo" }));

  if (full) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullScreenTimer
          eyebrow={`ADVANCED STRETCH ${pos.idx + 1} / ${STRETCHES.length}`}
          title={st.name}
          big={fmt(total - pos.elapsed)}
          badge={isReady ? "GET INTO POSITION" : "HOLD GENTLY"}
          pills={pills}
          lines={isReady ? [st.position, st.easier] : st.cues}
          purpose={isReady ? undefined : SAFETY}
          progress={pos.elapsed / total}
          nextUp={null}
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Advanced Stretches</Text>
          <Text style={styles.subtitle}>Best after training or on rest days</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.safety}>
          <Ionicons name="warning-outline" size={18} color={colors.brandSecondary} />
          <Text style={styles.safetyText}>{SAFETY}</Text>
        </View>
        {STRETCHES.map((s, i) => {
          const isOpen = open === i;
          const hold = s.segments.filter((g) => g.label !== "Get ready");
          return (
            <Pressable key={s.name} style={styles.card} onPress={() => setOpen(isOpen ? null : i)}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.time}>
                  {hold.length > 1 ? `${hold[0].seconds} s / side` : `${hold[0].seconds} s`}
                </Text>
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
                    <Text style={styles.startText}>Start hold timer</Text>
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          );
        })}
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
  safety: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  safetyText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flex: 1, color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  time: { color: colors.brandSecondary, fontSize: 13, fontWeight: "800" },
  targets: { color: colors.muted, fontSize: 13, marginTop: 4 },
  label: { color: colors.brandSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginTop: 8 },
  detail: { color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  start: { flexDirection: "row", gap: 6, alignSelf: "flex-start", alignItems: "center", backgroundColor: colors.brandPrimary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, marginTop: spacing.md },
  startText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "800" },
});
