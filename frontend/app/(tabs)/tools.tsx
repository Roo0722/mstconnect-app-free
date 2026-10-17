import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { WARMUP } from "../../src/warmupData";
import { STRETCHES } from "../../src/stretchData";
import { stepMs, withPrep } from "../../src/warmupEngine";
import { useGame } from "../../src/game/store";

type Tool = { key: string; title: string; subtitle: string; meta?: string; icon: any; route: any; accent: "red" | "yellow" };
type Section = { title: string; hint: string; tools: Tool[] };

// Training tools in the order of a session (warm up, train, stretch), then the match scorer, then reference pages.
function useSections(rankMeta: string): Section[] {
  return useMemo(() => {
    const warmMin = Math.round(withPrep(WARMUP).reduce((a, s) => a + stepMs(s), 0) / 60000);
    return [
      {
        title: "MY PROGRESS",
        hint: "Rank and training log",
        tools: [{ key: "training", title: "Training Log & Rank", subtitle: "Your minutes, weekly quests and rank ladder", meta: rankMeta, icon: "medal-outline", route: "/training", accent: "yellow" }],
      },
      {
        title: "TRAINING",
        hint: "For practice and conditioning",
        tools: [
          { key: "warmup", title: "Warm-Up Guide", subtitle: "Step-by-step routine with side colours and cues", meta: `~${warmMin} min`, icon: "flame-outline", route: "/tools/warmup", accent: "yellow" },
          { key: "timer", title: "HIIT Interval Timer", subtitle: "Work and rest rounds, with your own presets", meta: "Timer", icon: "stopwatch-outline", route: "/tools/timer", accent: "red" },
          { key: "stretches", title: "Flexibility & Kicking", subtitle: "Splits, active leg control and hip hinge", meta: `${STRETCHES.length} exercises`, icon: "body-outline", route: "/tools/stretches", accent: "red" },
        ],
      },
      {
        title: "MATCH",
        hint: "For game day",
        tools: [{ key: "score", title: "Score Counter", subtitle: "Team A vs Team B, landscape view", icon: "trophy-outline", route: "/tools/score", accent: "red" }],
      },
      {
        title: "REFERENCE",
        hint: "Look things up",
        tools: [{ key: "rules", title: "Rules & Court", subtitle: "Quick reference for rules and court layout", icon: "book-outline", route: "/tools/rules", accent: "yellow" }],
      },
    ];
  }, [rankMeta]);
}

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { game } = useGame();
  const sections = useSections(`${game.rankName}${game.division ? ` ${game.division}` : ""}`);
  return (
    <View style={styles.root}>
      <BackgroundGlow />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg }}>
        <Text style={styles.title} accessibilityRole="header">Tools</Text>
        <Text style={styles.subtitle}>Everything you need, courtside.</Text>
        {sections.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle} accessibilityRole="header">{sec.title}</Text>
              <Text style={styles.sectionHint}>{sec.hint}</Text>
            </View>
            {sec.tools.map((t) => (
              <Pressable
                key={t.key}
                testID={`tool-${t.key}`}
                accessibilityRole="button"
                accessibilityLabel={`${t.title}. ${t.subtitle}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => router.push(t.route)}
              >
                <View style={[styles.iconWrap, t.accent === "red" ? styles.iconRed : styles.iconYellow]}>
                  <Ionicons name={t.icon} size={24} color={t.accent === "red" ? colors.brandPrimary : colors.brandSecondary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <Text style={styles.cardSub}>{t.subtitle}</Text>
                </View>
                {t.meta ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{t.meta}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "900", letterSpacing: 0.3 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2 },
  sectionTitle: { color: colors.brandSecondary, fontSize: 12, fontWeight: "900", letterSpacing: 1.8 },
  sectionHint: { color: colors.muted, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 76,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  iconWrap: { width: 46, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  iconRed: { backgroundColor: colors.brandTertiary },
  iconYellow: { backgroundColor: "rgba(252, 209, 22, 0.15)" },
  rowText: { flex: 1, gap: 2 },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  cardSub: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  chip: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: colors.onSurface, fontSize: 11, fontWeight: "800" },
});
