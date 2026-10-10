import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { cue } from "../../src/sound";
import { FullScreenTimer, type Pill } from "../../src/FullScreenTimer";
import { WARMUP } from "../../src/warmupData";
import { advance, locate, stepEvents, stepMs, type Pos } from "../../src/warmupEngine";

const NEXT_WARNING_MS = 5000;
const EVENTS = WARMUP.map(stepEvents);
const TOTAL_MS = WARMUP.reduce((a, s) => a + stepMs(s), 0);
const STARTS = WARMUP.reduce<number[]>((a, s, i) => (a.push(i ? a[i - 1] + stepMs(WARMUP[i - 1]) : 0), a), []);

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function WarmupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [full, setFull] = useState(false);
  const [running, setRunning] = useState(false);
  const [pos, setPos] = useState<Pos>({ idx: 0, elapsed: 0 });
  const [open, setOpen] = useState<number | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  useKeepAwake("mstc-warmup");

  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = Math.min(500, now - last); // never jump after the app was frozen
      last = now;
      const r = advance(WARMUP, posRef.current, delta, (i) => EVENTS[i]);
      posRef.current = r.pos;
      setPos(r.pos);
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
  const jump = (d: -1 | 1) => {
    const idx = Math.max(0, Math.min(WARMUP.length - 1, pos.idx + d));
    const p = { idx, elapsed: 0 };
    posRef.current = p;
    setPos(p);
  };

  const step = WARMUP[pos.idx];
  const w = locate(step, pos.elapsed);
  const total = stepMs(step);
  const left = total - pos.elapsed;
  const nextStep = WARMUP[pos.idx + 1];
  const pills: Pill[] = step.segments.map((g, i) => ({
    label: g.label ?? "",
    state: i < w.seg ? "done" : i === w.seg ? "current" : "todo",
  }));
  const hasLabels = step.segments.some((g) => g.label);

  const groups = useMemo(() => {
    const out: { phase: string; items: number[] }[] = [];
    WARMUP.forEach((s, i) => {
      const last = out[out.length - 1];
      if (last && last.phase === s.phase) last.items.push(i);
      else out.push({ phase: s.phase, items: [i] });
    });
    return out;
  }, []);

  if (full) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullScreenTimer
          eyebrow={`${step.phase.toUpperCase()} · STEP ${pos.idx + 1} / ${WARMUP.length}`}
          title={step.name}
          big={fmt(left)}
          badge={w.rep ? `REP ${w.rep} / ${w.reps}` : step.segments[w.seg].beat ? "FOLLOW THE BEAT" : w.hold ? "HOLD" : undefined}
          pills={hasLabels ? pills : undefined}
          lines={step.details}
          purpose={step.purpose}
          progress={(STARTS[pos.idx] + pos.elapsed) / TOTAL_MS}
          nextUp={left <= NEXT_WARNING_MS && nextStep ? nextStep.name : null}
          running={running}
          showTickToggle
          onToggle={() => setRunning((v) => !v)}
          onPrev={() => jump(-1)}
          onNext={() => jump(1)}
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
          <Text style={styles.title}>Warm-Up Guide</Text>
          <Text style={styles.subtitle}>{WARMUP.length} steps · ~{Math.round(TOTAL_MS / 60000)} min · slow, gentle rhythm</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Pressable style={styles.start} onPress={() => begin(0)}>
          <Ionicons name="play" size={22} color={colors.onBrandPrimary} />
          <Text style={styles.startText}>Start warm-up</Text>
        </Pressable>
        {groups.map((g) => (
          <View key={g.phase}>
            <Text style={styles.section}>{g.phase.toUpperCase()}</Text>
            {g.items.map((i) => {
              const s = WARMUP[i];
              const isOpen = open === i;
              return (
                <Pressable key={s.name} style={styles.row} onPress={() => setOpen(isOpen ? null : i)}>
                  <View style={styles.rowTop}>
                    <View style={styles.idx}><Text style={styles.idxText}>{i + 1}</Text></View>
                    <Text style={styles.name}>{s.name}</Text>
                    <Text style={styles.time}>{fmt(stepMs(s))}</Text>
                  </View>
                  {isOpen ? (
                    <View style={{ marginTop: spacing.sm, gap: 4 }}>
                      {s.purpose ? <Text style={styles.purpose}>{s.purpose}</Text> : null}
                      {s.details.map((d, k) => (
                        <Text key={k} style={styles.detail}>• {d}</Text>
                      ))}
                      <Pressable style={styles.from} onPress={() => begin(i)}>
                        <Text style={styles.fromText}>Start from here</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
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
  start: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandPrimary, borderRadius: radius.lg, paddingVertical: 16, marginBottom: spacing.md },
  startText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "900" },
  section: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  idx: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  idxText: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  name: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  time: { color: colors.muted, fontSize: 13, fontVariant: ["tabular-nums"] },
  purpose: { color: colors.muted, fontSize: 13, fontStyle: "italic" },
  detail: { color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  from: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.brandTertiary },
  fromText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
});
