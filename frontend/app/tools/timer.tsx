import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { cue, useSoundEnabled } from "../../src/sound";
import { tickTimer, type Phase } from "../../src/timerLogic";

const PRESETS = [
  { label: "5 × 2' / 30\"", work: 120, rest: 30, rounds: 5 },
  { label: "8 × 1' / 20\"", work: 60, rest: 20, rounds: 8 },
  { label: "3 × 3' / 60\"", work: 180, rest: 60, rounds: 3 },
];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [presetIdx, setPresetIdx] = useState(0);
  const preset = PRESETS[presetIdx];
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(preset.work);
  const [round, setRound] = useState(1);
  const [soundOn, setSoundOn] = useSoundEnabled();
  useKeepAwake("mstc-timer"); // screen stays on while the timer screen is open

  // latest values for the 1-second interval (avoids stale closures)
  const latest = useRef({ phase, remaining, round, preset });
  latest.current = { phase, remaining, round, preset };

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIdx]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const cur = latest.current;
      const res = tickTimer({ phase: cur.phase, remaining: cur.remaining, round: cur.round }, cur.preset);
      setPhase(res.state.phase);
      setRemaining(res.state.remaining);
      setRound(res.state.round);
      if (res.finished) setRunning(false);
      cue(res.cue);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (!running && phase === "work" && round === 1 && remaining === preset.work) cue("start");
    setRunning((v) => !v);
  };

  const reset = () => {
    setRunning(false);
    setPhase("work");
    setRound(1);
    setRemaining(preset.work);
  };

  const isWork = phase === "work";

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={[styles.title, { flex: 1 }]}>Training Timer</Text>
        <Pressable testID="sound-toggle" onPress={() => setSoundOn(!soundOn)} style={styles.backBtn}>
          <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={20} color={soundOn ? colors.brandSecondary : colors.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, alignItems: "center" }}>
        <Text style={styles.phase} testID="timer-phase">
          {isWork ? "WORK" : "REST"}
        </Text>
        <View style={[styles.ring, { borderColor: isWork ? colors.brandPrimary : colors.brandSecondary }]}>
          <Text style={styles.time} testID="timer-time">{fmt(remaining)}</Text>
          <Text style={styles.round}>ROUND {round} / {preset.rounds}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            testID="timer-reset"
            style={styles.ctrlSecondary}
            onPress={reset}
          >
            <Ionicons name="refresh" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable
            testID="timer-toggle"
            style={[styles.ctrlPrimary, { backgroundColor: running ? colors.surfaceTertiary : colors.brandPrimary }]}
            onPress={toggle}
          >
            <Ionicons
              name={running ? "pause" : "play"}
              size={28}
              color={running ? colors.onSurface : colors.onBrandPrimary}
            />
          </Pressable>
          <View style={{ width: 48 }} />
        </View>

        <Text style={styles.sectionLabel}>PRESETS</Text>
        <View style={styles.presetsRow}>
          {PRESETS.map((p, i) => (
            <Pressable
              key={p.label}
              testID={`preset-${i}`}
              style={[styles.preset, i === presetIdx && styles.presetActive]}
              onPress={() => setPresetIdx(i)}
            >
              <Text style={[styles.presetText, i === presetIdx && styles.presetTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  phase: { color: colors.brandSecondary, fontSize: 14, fontWeight: "900", letterSpacing: 2.4, marginTop: spacing.lg },
  ring: {
    width: 260, height: 260, borderRadius: 130,
    borderWidth: 6,
    alignItems: "center", justifyContent: "center",
    marginVertical: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  time: { color: colors.onSurface, fontSize: 64, fontWeight: "900", letterSpacing: 1 },
  round: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, marginTop: 4 },
  controls: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  ctrlSecondary: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  ctrlPrimary: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
  },
  sectionLabel: {
    color: colors.finePrint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4,
    alignSelf: "flex-start", marginBottom: spacing.sm,
  },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignSelf: "stretch" },
  preset: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  presetActive: { backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary },
  presetText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  presetTextActive: { color: colors.onBrandSecondary },
});
