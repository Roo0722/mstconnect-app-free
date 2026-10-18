import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { useActivityTracker } from "../../src/game/useTracker";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { cue, preloadSounds, useSoundEnabled } from "../../src/sound";
import { segLook } from "../../src/sideColors";
import { tickTimer, type Phase } from "../../src/timerLogic";
import { FullScreenTimer } from "../../src/FullScreenTimer";

const PRESETS = [
  { label: "5 × 2' / 30\"", work: 120, rest: 30, rounds: 5 },
  { label: "8 × 1' / 20\"", work: 60, rest: 20, rounds: 8 },
  { label: "3 × 3' / 60\"", work: 180, rest: 60, rounds: 3 },
  { label: "30 min · 20 × 1' / 30\"", work: 60, rest: 30, rounds: 20 },
  { label: "60 min · 40 × 1' / 30\"", work: 60, rest: 30, rounds: 40 },
];

const CUSTOM_KEY = "mstc:presets";
const SKIP_KEY = "mstc:hiit-skip-last-rest";
type CustomPreset = { label: string; work: number; rest: number; rounds: number };
const short = (sec: number) => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  if (m === 0) return `${r}"`;
  return r === 0 ? `${m}'` : `${m}'${String(r).padStart(2, "0")}"`;
};
const labelFor = (work: number, rest: number, rounds: number) => `${rounds} × ${short(work)} / ${short(rest)}`;

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const LEAD_SECONDS = 5; // "Get ready" before round 1

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [presetIdx, setPresetIdx] = useState(0);
  const [custom, setCustom] = useState<CustomPreset[]>([]);
  const [editor, setEditor] = useState<{ work: number; rest: number; rounds: number } | null>(null);
  const allPresets = [...PRESETS, ...custom];
  const preset = allPresets[presetIdx] ?? PRESETS[0];

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_KEY)
      .then((v) => {
        if (v) setCustom(JSON.parse(v));
      })
      .catch(() => {});
  }, []);
  const saveCustom = (next: CustomPreset[]) => {
    setCustom(next);
    AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next)).catch(() => {});
  };
  const addCustom = () => {
    if (!editor) return;
    const label = labelFor(editor.work, editor.rest, editor.rounds);
    const exists = allPresets.findIndex((p) => p.work === editor.work && p.rest === editor.rest && p.rounds === editor.rounds);
    if (exists >= 0) {
      setPresetIdx(exists);
    } else {
      saveCustom([...custom, { label, ...editor }]);
      setPresetIdx(PRESETS.length + custom.length);
    }
    setEditor(null);
  };
  const removeCustom = (i: number) => {
    Alert.alert("Delete preset?", allPresets[PRESETS.length + i].label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          saveCustom(custom.filter((_, k) => k !== i));
          setPresetIdx(0);
        },
      },
    ]);
  };
  const [running, setRunning] = useState(false);
  useActivityTracker("hiit", running, `${preset.rounds} x ${preset.work}s / ${preset.rest}s`);
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(preset.work);
  const [round, setRound] = useState(1);
  // "Get ready" countdown before round 1: null = not started yet, 0 = finished
  const [lead, setLead] = useState<number | null>(null);
  const [skipLast, setSkipLast] = useState(false); // end right after the last work round (no final rest)
  useEffect(() => {
    AsyncStorage.getItem(SKIP_KEY).then((v) => setSkipLast(v === "1")).catch(() => {});
  }, []);
  const changeSkip = (v: boolean) => {
    setSkipLast(v);
    AsyncStorage.setItem(SKIP_KEY, v ? "1" : "0").catch(() => {});
  };
  const [soundOn, setSoundOn] = useSoundEnabled();
  const [full, setFull] = useState(false);
  useKeepAwake("mstc-timer"); // screen stays on while the timer screen is open
  useEffect(() => preloadSounds(), []);

  // latest values for the 1-second interval (avoids stale closures)
  const latest = useRef({ phase, remaining, round, preset, lead, skipLast });
  latest.current = { phase, remaining, round, preset, lead, skipLast };

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIdx]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const cur = latest.current;
      if (cur.lead !== null && cur.lead > 0) {
        const l = cur.lead - 1;
        latest.current = { ...cur, lead: l };
        setLead(l);
        cue(l === 0 ? "start" : l <= 3 ? "beep" : "none");
        return;
      }
      const res = tickTimer({ phase: cur.phase, remaining: cur.remaining, round: cur.round }, cur.preset, cur.skipLast);
      setPhase(res.state.phase);
      setRemaining(res.state.remaining);
      setRound(res.state.round);
      if (res.finished) {
        setRunning(false);
        setLead(null);
      }
      cue(res.cue);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (!running && lead === null) {
      setLead(LEAD_SECONDS); // fresh start: count in first
      cue("switch");
    }
    setRunning((v) => !v);
  };

  const reset = () => {
    setRunning(false);
    setPhase("work");
    setRound(1);
    setRemaining(preset.work);
    setLead(null);
  };

  const getReady = lead !== null && lead > 0;
  const isWork = phase === "work";
  // same colours as the routines: slate = get ready, amber = rest, work keeps the normal look
  const look = getReady ? segLook("Get ready") : isWork ? null : segLook("Rest");

  if (full) {
    const perRound = preset.work + preset.rest;
    const done = (round - 1) * perRound + (isWork ? preset.work - remaining : preset.work + preset.rest - remaining);
    const total = perRound * preset.rounds - (skipLast ? preset.rest : 0);
    const nextText = isWork ? `REST · ${preset.rest} s` : round >= preset.rounds ? "FINISH" : `ROUND ${round + 1}`;
    const lastWork = isWork && round >= preset.rounds && skipLast;
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullScreenTimer
          eyebrow={`ROUND ${round} / ${preset.rounds}`}
          title={getReady ? "GET READY" : isWork ? "WORK" : "REST"}
          big={fmt(getReady ? lead! : remaining)}
          progress={Math.min(1, done / total)}
          accent={look?.accent ?? colors.brandPrimary}
          tint={look?.tint}
          urgent={running && (getReady ? lead! <= 3 : remaining <= 3 && (isWork ? preset.work : preset.rest) > 5)}
          nextUp={getReady ? "ROUND 1" : remaining <= 5 ? (lastWork ? "FINISH" : nextText) : null}
          running={running}
          onToggle={toggle}
          onClose={() => setFull(false)}
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={[styles.title, { flex: 1 }]}>HIIT Interval Timer</Text>
        <Pressable testID="sound-toggle" onPress={() => setSoundOn(!soundOn)} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={soundOn ? "Mute sound" : "Turn sound on"}>
          <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={20} color={soundOn ? colors.brandSecondary : colors.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, alignItems: "center" }}>
        <Text style={styles.phase} testID="timer-phase">
          {getReady ? "GET READY" : isWork ? "WORK" : "REST"}
        </Text>
        <View style={[styles.ring, { borderColor: isWork || getReady ? colors.brandPrimary : colors.brandSecondary }]}>
          <Text style={styles.time} testID="timer-time">{fmt(getReady ? lead! : remaining)}</Text>
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
          <Pressable testID="timer-full" style={styles.ctrlSecondary} onPress={() => setFull(true)} accessibilityLabel="Full screen">
            <Ionicons name="expand" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        <Text style={styles.total}>
          Total {fmt(preset.rounds * (preset.work + preset.rest) - (skipLast ? preset.rest : 0))}
        </Text>
        <View style={styles.optRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.optTitle}>End after the last work round</Text>
            <Text style={styles.optSub}>Skips the final rest, so you finish as soon as the last work round ends.</Text>
          </View>
          <Switch value={skipLast} onValueChange={changeSkip} trackColor={{ true: colors.brandSecondary }} accessibilityLabel="End after the last work round" />
        </View>

        <Text style={styles.sectionLabel}>PRESETS</Text>
        <View style={styles.presetsRow}>
          {allPresets.map((p, i) => (
            <Pressable
              key={p.label + i}
              testID={`preset-${i}`}
              style={[styles.preset, i === presetIdx && styles.presetActive]}
              onPress={() => setPresetIdx(i)}
              onLongPress={i >= PRESETS.length ? () => removeCustom(i - PRESETS.length) : undefined}
            >
              <Text style={[styles.presetText, i === presetIdx && styles.presetTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.preset} onPress={() => setEditor(editor ? null : { work: 45, rest: 15, rounds: 6 })}>
            <Text style={styles.presetText}>{editor ? "Cancel" : "+ Custom"}</Text>
          </Pressable>
        </View>
        {custom.length ? <Text style={styles.hint}>Tip: press and hold your own preset to delete it.</Text> : null}
        {editor ? (
          <View style={styles.editor}>
            <Stepper label="Work" value={short(editor.work)} onMinus={() => setEditor((e) => e && { ...e, work: Math.max(5, e.work - 5) })} onPlus={() => setEditor((e) => e && { ...e, work: Math.min(600, e.work + 5) })} />
            <Stepper label="Rest" value={short(editor.rest)} onMinus={() => setEditor((e) => e && { ...e, rest: Math.max(5, e.rest - 5) })} onPlus={() => setEditor((e) => e && { ...e, rest: Math.min(300, e.rest + 5) })} />
            <Stepper label="Rounds" value={String(editor.rounds)} onMinus={() => setEditor((e) => e && { ...e, rounds: Math.max(1, e.rounds - 1) })} onPlus={() => setEditor((e) => e && { ...e, rounds: Math.min(30, e.rounds + 1) })} />
            <Pressable style={styles.save} onPress={addCustom}>
              <Text style={styles.saveText}>Save {labelFor(editor.work, editor.rest, editor.rounds)}</Text>
            </Pressable>
          </View>
        ) : null}
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
  total: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: spacing.sm },
  optRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, alignSelf: "stretch", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg },
  optTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  optSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  hint: { color: colors.finePrint, fontSize: 11, alignSelf: "flex-start", marginTop: spacing.sm },
  editor: { alignSelf: "stretch", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepLabel: { color: colors.muted, fontSize: 13, fontWeight: "700", width: 70 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  stepValue: { color: colors.onSurface, fontSize: 18, fontWeight: "900", minWidth: 70, textAlign: "center" },
  save: { backgroundColor: colors.brandPrimary, borderRadius: radius.pill, paddingVertical: 10, alignItems: "center", marginTop: spacing.xs },
  saveText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800" },
});

function HoldButton({ icon, onStep, label }: { icon: "add" | "remove"; onStep: () => void; label: string }) {
  const step = useRef(onStep);
  step.current = onStep; // always the latest handler, so repeating keeps working as the value changes
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
      style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]}
      onPressIn={() => {
        repeated.current = false;
        stop();
        delay.current = setTimeout(() => {
          repeated.current = true;
          step.current();
          loop.current = setInterval(() => step.current(), 90);
        }, 400);
      }}
      onPressOut={stop}
      onPress={() => {
        if (!repeated.current) step.current(); // a quick tap = one step; holding = repeat
      }}
    >
      <Ionicons name={icon} size={18} color={colors.onSurface} />
    </Pressable>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepLabel}>{label}</Text>
      <HoldButton icon="remove" onStep={onMinus} label={`${label} less`} />
      <Text style={styles.stepValue}>{value}</Text>
      <HoldButton icon="add" onStep={onPlus} label={`${label} more`} />
    </View>
  );
}
