import { useEffect, useRef, useState, type ComponentProps } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";

type Step = {
  name: string;
  cue: string;
  detail: string;
  side: string;
  seconds: number;
  icon: ComponentProps<typeof Ionicons>["name"];
};

const STEPS: Step[] = [
  { name: "Light march", cue: "Easy marching to raise your temperature.", detail: "Move both arms and legs gently for one minute before the head-to-toe mobility sequence.", side: "BOTH SIDES", seconds: 60, icon: "walk-outline" },
  { name: "Head mobility", cue: "Look right, left, up, then down — gently.", detail: "Make small, slow nods and turns. Keep the neck relaxed; do not force a full neck roll.", side: "BOTH DIRECTIONS", seconds: 30, icon: "body-outline" },
  { name: "Right shoulder & arm", cue: "Circle the right arm forward, then backward.", detail: "Make 10 controlled circles each way. Keep the left arm relaxed by your side.", side: "RIGHT SIDE", seconds: 30, icon: "sync-outline" },
  { name: "Left shoulder & arm", cue: "Circle the left arm forward, then backward.", detail: "Make 10 controlled circles each way. Keep the right arm relaxed by your side.", side: "LEFT SIDE", seconds: 30, icon: "sync-outline" },
  { name: "Right trunk rotation", cue: "Rotate your chest slowly to the right.", detail: "Keep hips facing forward and let the arms follow. Return to centre after each turn.", side: "RIGHT SIDE", seconds: 30, icon: "refresh-outline" },
  { name: "Left trunk rotation", cue: "Rotate your chest slowly to the left.", detail: "Keep hips facing forward and let the arms follow. Return to centre after each turn.", side: "LEFT SIDE", seconds: 30, icon: "refresh-outline" },
  { name: "Right hip opener", cue: "Lift the right knee, open it out, and step down.", detail: "Make six smooth hip circles while staying tall over your left standing leg.", side: "RIGHT SIDE", seconds: 30, icon: "repeat-outline" },
  { name: "Left hip opener", cue: "Lift the left knee, open it out, and step down.", detail: "Make six smooth hip circles while staying tall over your right standing leg.", side: "LEFT SIDE", seconds: 30, icon: "repeat-outline" },
  { name: "Right leg swings", cue: "Swing the right leg forward and back.", detail: "Use a wall or partner for balance. Keep the knee soft and build range slowly.", side: "RIGHT SIDE", seconds: 45, icon: "git-compare-outline" },
  { name: "Left leg swings", cue: "Swing the left leg forward and back.", detail: "Use a wall or partner for balance. Keep the knee soft and build range slowly.", side: "LEFT SIDE", seconds: 45, icon: "git-compare-outline" },
  { name: "Right ankle & calf", cue: "Circle the right ankle, then rise onto both toes.", detail: "Make 10 ankle circles each way, then finish with 10 gentle calf raises on both feet.", side: "RIGHT SIDE", seconds: 30, icon: "footsteps-outline" },
  { name: "Left ankle & calf", cue: "Circle the left ankle, then rise onto both toes.", detail: "Make 10 ankle circles each way, then finish with 10 gentle calf raises on both feet.", side: "LEFT SIDE", seconds: 30, icon: "footsteps-outline" },
  { name: "Right lateral lunge", cue: "Sit back over the right leg with control.", detail: "Keep the left leg long and your chest lifted. Push through the right foot to return to centre.", side: "RIGHT SIDE", seconds: 45, icon: "arrow-expand-outline" },
  { name: "Left lateral lunge", cue: "Sit back over the left leg with control.", detail: "Keep the right leg long and your chest lifted. Push through the left foot to return to centre.", side: "LEFT SIDE", seconds: 45, icon: "arrow-expand-outline" },
  { name: "Right controlled kicks", cue: "Use five low, easy kicks with the right foot.", detail: "Start below waist height and build gradually. Stop if anything pinches or hurts.", side: "RIGHT SIDE", seconds: 45, icon: "football-outline" },
  { name: "Left controlled kicks", cue: "Use five low, easy kicks with the left foot.", detail: "Start below waist height and build gradually. Stop if anything pinches or hurts.", side: "LEFT SIDE", seconds: 45, icon: "football-outline" },
  { name: "Alternating ball touches", cue: "Use soft inside-foot touches, right then left.", detail: "Keep touches low and relaxed before gradually increasing your pace.", side: "BOTH SIDES", seconds: 45, icon: "football-outline" },
  { name: "Soft landing taps", cue: "Use low, rhythmic hops and land softly.", detail: "Absorb each landing with both knees and hips before the next rep.", side: "BOTH LEGS", seconds: 30, icon: "fitness-outline" },
];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function WarmupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(STEPS[0].seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        setIdx((i) => {
          if (i + 1 >= STEPS.length) {
            setRunning(false);
            setTimeout(() => {
              setRemaining(STEPS[0].seconds);
            }, 0);
            return 0;
          }
          setTimeout(() => setRemaining(STEPS[i + 1].seconds), 0);
          return i + 1;
        });
        return 0;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const totalSec = STEPS.reduce((a, b) => a + b.seconds, 0);
  const current = STEPS[idx];
  const moveStep = (direction: -1 | 1) => {
    setIdx((currentIdx) => {
      const nextIdx = Math.min(Math.max(currentIdx + direction, 0), STEPS.length - 1);
      setRemaining(STEPS[nextIdx].seconds);
      return nextIdx;
    });
  };
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/tools");
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-btn" onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Warm-Up Guide</Text>
          <Text style={styles.subtitle}>{STEPS.length} steps · ~{Math.round(totalSec / 60)} min</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.active}>
          <Text style={styles.activeLabel}>CURRENT STEP · {idx + 1}/{STEPS.length}</Text>
          <View testID="warmup-movement-visual" style={styles.movementVisual}>
            <Ionicons name={current.icon} size={38} color={colors.brandSecondary} />
            <View style={styles.sideBadge}>
              <Text testID="warmup-side-cue" style={styles.sideBadgeText}>{current.side}</Text>
            </View>
          </View>
          <Text style={styles.activeName} testID="warmup-step-name">{current.name}</Text>
          <Text style={styles.activeCue}>{current.cue}</Text>
          <Text testID="warmup-step-description" style={styles.activeDetail}>{current.detail}</Text>
          <Text style={styles.activeTime} testID="warmup-time">{fmt(remaining)}</Text>
          <View style={styles.row}>
            <Pressable
              testID="warmup-prev"
              style={styles.ctrlSecondary}
              onPress={() => moveStep(-1)}
            >
              <Ionicons name="play-skip-back" size={18} color={colors.onSurface} />
            </Pressable>
            <Pressable
              testID="warmup-toggle"
              style={[styles.ctrlPrimary, { backgroundColor: running ? colors.surfaceTertiary : colors.brandPrimary }]}
              onPress={() => setRunning((v) => !v)}
            >
              <Ionicons name={running ? "pause" : "play"} size={24} color={running ? colors.onSurface : colors.onBrandPrimary} />
            </Pressable>
            <Pressable
              testID="warmup-next"
              style={styles.ctrlSecondary}
              onPress={() => moveStep(1)}
            >
              <Ionicons name="play-skip-forward" size={18} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>

        <Text testID="warmup-flow-label" style={styles.sectionLabel}>FLOW · HEAD → SHOULDERS → TRUNK → HIPS → LEGS → FEET → TAKRAW</Text>
        {STEPS.map((s, i) => (
          <View key={s.name} testID={`warmup-step-${i + 1}`} style={[styles.step, i === idx && styles.stepActive]}>
            <View style={styles.stepIdx}>
              <Text style={styles.stepIdxText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepName}>{s.name}</Text>
              <Text style={styles.stepCue}>{s.cue}</Text>
              <Text style={styles.stepSide}>{s.side}</Text>
            </View>
            <Text style={styles.stepTime}>{fmt(s.seconds)}</Text>
          </View>
        ))}
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
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  active: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  activeLabel: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  movementVisual: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  sideBadge: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  sideBadgeText: { color: colors.brandSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  activeName: { color: colors.onSurface, fontSize: 22, fontWeight: "900", marginTop: 8, textAlign: "center" },
  activeCue: { color: colors.muted, fontSize: 13, marginTop: 4, textAlign: "center" },
  activeDetail: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, textAlign: "center" },
  activeTime: { color: colors.onSurface, fontSize: 54, fontWeight: "900", letterSpacing: 1, marginVertical: spacing.md },
  row: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
  ctrlSecondary: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  ctrlPrimary: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
  },
  sectionLabel: { color: colors.finePrint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: spacing.sm },
  step: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  stepActive: { borderColor: colors.brandSecondary },
  stepIdx: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  stepIdxText: { color: colors.brandSecondary, fontSize: 12, fontWeight: "800" },
  stepName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  stepCue: { color: colors.muted, fontSize: 12 },
  stepSide: { color: colors.brandSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 0.6, marginTop: 3 },
  stepTime: { color: colors.brandSecondary, fontSize: 13, fontWeight: "800" },
});
