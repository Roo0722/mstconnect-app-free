import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, LayoutAnimation } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { useActivityTracker } from "../../src/game/useTracker";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { cue, preloadSounds } from "../../src/sound";
import { FullScreenTimer } from "../../src/FullScreenTimer";
import { WARMUP_LENGTHS, WARMUP_SAFETY, getWarmup, type WarmupLength } from "../../src/warmupData";
import { advance, displayKey, isPrep, stepEvents, stepMs, withPrep, type Pos } from "../../src/warmupEngine";
import { moment } from "../../src/routineView";

const NEXT_WARNING_MS = 5000;
const LENGTH_KEY = "mstc:warmup-length";

// every exercise gets a short "Get ready" gap in front of it
function build(length: WarmupLength) {
  const base = getWarmup(length);
  const steps = withPrep(base);
  const events = steps.map((s, i) => stepEvents(s, { followedByPrep: i < steps.length - 1 && isPrep(steps[i + 1].segments[0]) }));
  const total = steps.reduce((a, s) => a + stepMs(s), 0);
  const starts = steps.reduce<number[]>((a, s, i) => (a.push(i ? a[i - 1] + stepMs(steps[i - 1]) : 0), a), []);
  return { base, steps, events, total, starts };
}
const BUILT = { short: build("short"), standard: build("standard"), long: build("long") };

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function WarmupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [full, setFull] = useState(false);
  const [running, setRunning] = useState(false);
  const [length, setLength] = useState<WarmupLength>("standard");
  useActivityTracker("warmup", running, length);
  useEffect(() => {
    AsyncStorage.getItem(LENGTH_KEY)
      .then((v) => {
        if (v === "short" || v === "standard" || v === "long") setLength(v);
      })
      .catch(() => {});
  }, []);
  const { base: WARMUP, steps: STEPS, events: EVENTS, total: TOTAL_MS, starts: STARTS } = BUILT[length];
  const pickLength = (l: WarmupLength) => {
    if (l === length) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLength(l);
    setOpen(null);
    setFinished(false);
    posRef.current = { idx: 0, elapsed: 0 };
    setPos({ idx: 0, elapsed: 0 });
    AsyncStorage.setItem(LENGTH_KEY, l).catch(() => {});
  };
  const [pos, setPos] = useState<Pos>({ idx: 0, elapsed: 0 });
  const [open, setOpen] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const posRef = useRef(pos);
  useKeepAwake("mstc-warmup");
  useEffect(() => preloadSounds(), []);

  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = Math.min(500, now - last); // never jump after the app was frozen
      last = now;
      const r = advance(STEPS, posRef.current, delta, (i) => EVENTS[i]);
      const prev = posRef.current;
      posRef.current = r.pos;
      // the engine ticks 10x a second; only redraw when something on screen changes
      if (r.finished || displayKey(STEPS[r.pos.idx], r.pos.idx, r.pos.elapsed) !== displayKey(STEPS[prev.idx], prev.idx, prev.elapsed)) setPos(r.pos);
      cue(r.cue);
      if (r.finished) {
        setFinished(true);
        setRunning(false);
        setFull(false);
      }
    }, 100);
    return () => {
      clearInterval(id);
      setPos(posRef.current); // when paused, show exactly where we stopped
    };
  }, [running, STEPS, EVENTS]);

  const begin = (idx: number) => {
    const p = { idx, elapsed: 0 };
    posRef.current = p;
    setPos(p);
    setFinished(false);
    setFull(true);
    setRunning(true);
    cue("start");
  };
  const jump = (d: -1 | 1) => {
    const idx = Math.max(0, Math.min(STEPS.length - 1, pos.idx + d));
    const p = { idx, elapsed: 0 };
    posRef.current = p;
    setPos(p);
  };

  const step = STEPS[pos.idx];
  const followedByPrep = pos.idx < STEPS.length - 1 && isPrep(STEPS[pos.idx + 1].segments[0]);
  const m = moment(step, pos.elapsed, { followedByPrep });
  const nextStep = STEPS[pos.idx + 1];

  const groups = useMemo(() => {
    const out: { phase: string; items: number[] }[] = [];
    WARMUP.forEach((s, i) => {
      const last = out[out.length - 1];
      if (last && last.phase === s.phase) last.items.push(i);
      else out.push({ phase: s.phase, items: [i] });
    });
    return out;
  }, [WARMUP]);

  if (full) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullScreenTimer
          eyebrow={`${step.phase.toUpperCase()} · STEP ${pos.idx + 1} / ${WARMUP.length}`}
          title={step.name}
          big={fmt(m.leftMs)}
          cueWord={m.cueWord}
          badge={m.badge}
          then={m.then}
          pills={m.pills}
          lines={m.switching ? [m.nextSeg ? `Next: ${m.nextSeg.label}` : "Switch sides", "Reset your position and breathe."] : step.details}
          purpose={m.pause || m.getReady ? undefined : step.purpose}
          progress={(STARTS[pos.idx] + pos.elapsed) / TOTAL_MS}
          nextUp={!m.getReady && !m.pause && m.leftMs <= NEXT_WARNING_MS && nextStep ? nextStep.name : null}
          accent={m.look?.accent}
          tint={m.look?.tint}
          urgent={m.urgent}
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
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Warm-Up Guide</Text>
          <Text style={styles.subtitle}>{WARMUP.length} steps · ~{Math.round(TOTAL_MS / 60000)} min · slow, gentle rhythm</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {finished ? (
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={22} color="#34d399" />
            <Text style={styles.doneText}>Warm-up complete. You are ready for training (HIIT).</Text>
          </View>
        ) : null}
        <View style={styles.seg} accessibilityRole="radiogroup">
          {WARMUP_LENGTHS.map((l) => {
            const on = l.key === length;
            return (
              <Pressable
                key={l.key}
                onPress={() => pickLength(l.key)}
                style={[styles.segBtn, on && styles.segOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${l.label} warm-up, about ${Math.round(BUILT[l.key].total / 60000)} minutes`}
              >
                <Text style={[styles.segLabel, on && styles.segLabelOn]}>{l.label}</Text>
                <Text style={[styles.segMin, on && styles.segLabelOn]}>~{Math.round(BUILT[l.key].total / 60000)} min</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.segAbout}>{WARMUP_LENGTHS.find((l) => l.key === length)?.about}</Text>
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
                <Pressable key={s.name} style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setOpen(isOpen ? null : i);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}>
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
        <Text style={styles.section}>SAFETY CHECKS</Text>
        <View style={styles.row}>
          {WARMUP_SAFETY.map((t, k) => (
            <Text key={k} style={styles.detail}>• {t}</Text>
          ))}
        </View>
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
  seg: { flexDirection: "row", gap: 8, marginBottom: 6 },
  segBtn: { flex: 1, minHeight: 56, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary },
  segLabel: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  segLabelOn: { color: colors.onBrandSecondary },
  segMin: { color: colors.muted, fontSize: 11, marginTop: 1 },
  segAbout: { color: colors.finePrint, fontSize: 12, marginBottom: spacing.md, textAlign: "center" },
  start: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandPrimary, borderRadius: radius.lg, paddingVertical: 16, marginBottom: spacing.md },
  startText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "900" },
  done: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "rgba(52, 211, 153, 0.15)", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  doneText: { flex: 1, color: colors.onSurface, fontSize: 14, fontWeight: "700" },
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
