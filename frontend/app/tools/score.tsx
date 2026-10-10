import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";

// Manual rotate: portrait by default, landscape only when the user taps the button.
function lockTo(landscape: boolean) {
  try {
    const so = require("expo-screen-orientation");
    so.lockAsync(landscape ? so.OrientationLock.LANDSCAPE : so.OrientationLock.PORTRAIT_UP).catch(() => {});
  } catch {}
}

// Hide / restore the Android navigation bar (best effort).
function immersive(on: boolean) {
  try {
    const nb = require("expo-navigation-bar");
    nb.setVisibilityAsync(on ? "hidden" : "visible").catch(() => {});
  } catch {}
}

export default function ScoreScreen() {
  const [landscape, setLandscape] = useState(false);
  useEffect(() => {
    lockTo(landscape);
  }, [landscape]);
  useEffect(() => {
    immersive(landscape); // true full screen in landscape: no status bar, no navigation bar
  }, [landscape]);
  useEffect(
    () => () => {
      lockTo(false); // leaving the screen always returns to portrait
      immersive(false);
    },
    [],
  );
  useKeepAwake("mstc-score");
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [nameA, setNameA] = useState("Team A");
  const [nameB, setNameB] = useState("Team B");
  const [editing, setEditing] = useState(false);

  const reset = () => { setA(0); setB(0); };

  return (
    <View style={[styles.root, landscape && { paddingLeft: Math.max(insets.left, spacing.lg), paddingRight: Math.max(insets.right, spacing.lg) }]}>
      <StatusBar hidden={landscape} />
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: landscape ? Math.max(insets.top, spacing.sm) : insets.top + spacing.md, paddingHorizontal: landscape ? 0 : spacing.lg }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Score Counter</Text>
        </View>
        <Pressable testID="rotate-btn" style={styles.editBtn} onPress={() => setLandscape((v) => !v)} accessibilityLabel="Rotate">
          <Ionicons name="phone-landscape-outline" size={18} color={landscape ? colors.brandSecondary : colors.onSurface} />
        </Pressable>
        <Pressable
          testID="edit-names-btn"
          style={styles.editBtn}
          onPress={() => setEditing((v) => !v)}
        >
          <Ionicons name={editing ? "checkmark" : "create-outline"} size={18} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={[styles.body, landscape && { flexDirection: "row", paddingHorizontal: 0, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TeamPanel
          name={nameA}
          setName={setNameA}
          score={a}
          onInc={() => setA((n) => n + 1)}
          onDec={() => setA((n) => Math.max(0, n - 1))}
          editing={editing}
          accent={colors.brandPrimary}
          compact={landscape}
          testPrefix="team-a"
        />
        <View style={[styles.vs, landscape && { flexDirection: "column", justifyContent: "center", paddingHorizontal: 0, gap: spacing.md, width: 96 }]}>
          <Text style={styles.vsText}>VS</Text>
          <Pressable testID="score-reset" style={styles.resetBtn} onPress={reset}>
            <Ionicons name="refresh" size={16} color={colors.onBrandSecondary} />
            <Text style={styles.resetText}>RESET</Text>
          </Pressable>
        </View>
        <TeamPanel
          name={nameB}
          setName={setNameB}
          score={b}
          onInc={() => setB((n) => n + 1)}
          onDec={() => setB((n) => Math.max(0, n - 1))}
          editing={editing}
          accent={colors.brandSecondary}
          compact={landscape}
          testPrefix="team-b"
        />
      </View>
    </View>
  );
}

function TeamPanel({
  name, setName, score, onInc, onDec, editing, accent, testPrefix, compact,
}: {
  compact?: boolean;
  name: string; setName: (s: string) => void; score: number;
  onInc: () => void; onDec: () => void; editing: boolean; accent: string; testPrefix: string;
}) {
  return (
    <View style={styles.panel}>
      {editing ? (
        <TextInput
          testID={`${testPrefix}-name-input`}
          value={name}
          onChangeText={setName}
          style={styles.nameInput}
        />
      ) : (
        <Text style={styles.name} testID={`${testPrefix}-name`}>{name}</Text>
      )}
      <Pressable testID={`${testPrefix}-inc`} onPress={onInc} style={styles.scoreTap}>
        <Text style={[styles.score, { color: accent }, compact && { fontSize: 72 }]} testID={`${testPrefix}-score`}>{score}</Text>
        {compact ? null : <Text style={styles.tapHint}>Tap to score</Text>}
      </Pressable>
      <View style={styles.panelRow}>
        <Pressable testID={`${testPrefix}-dec`} onPress={onDec} style={styles.decBtn}>
          <Ionicons name="remove" size={20} color={colors.onSurface} />
        </Pressable>
      </View>
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
  editBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  panel: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: { color: colors.onSurface, fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  nameInput: {
    color: colors.onSurface, fontSize: 16, fontWeight: "800", letterSpacing: 0.4,
    borderBottomWidth: 1, borderBottomColor: colors.borderStrong,
    paddingHorizontal: 10, minWidth: 160, textAlign: "center",
  },
  scoreTap: { alignItems: "center", justifyContent: "center", flex: 1, alignSelf: "stretch" },
  score: { fontSize: 96, fontWeight: "900", letterSpacing: 1 },
  tapHint: { color: colors.finePrint, fontSize: 11, letterSpacing: 1.4, marginTop: -4 },
  panelRow: { flexDirection: "row", gap: spacing.sm },
  decBtn: {
    width: 48, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  vs: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  vsText: { color: colors.muted, fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  resetBtn: {
    flexDirection: "row", gap: 6, alignItems: "center",
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  resetText: { color: colors.onBrandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
});
