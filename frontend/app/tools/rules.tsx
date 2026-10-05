import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";

const SECTIONS = [
  {
    title: "The Game",
    icon: "football-outline" as const,
    items: [
      "A regu has three players: a Tekong, Left Inside player, and Right Inside player.",
      "Players use feet, knees, chest, and head — hands and arms are not allowed in play.",
      "A match is best of three sets; the first regu to win two sets wins the match.",
    ],
  },
  {
    title: "The Court",
    icon: "grid-outline" as const,
    items: [
      "The court is 13.4 m long × 6.1 m wide, divided by a 0.02 m centre line.",
      "Each service circle has a 0.3 m radius; its centre is 2.45 m from the back line and 3.05 m from the sideline.",
      "Quarter circles at both ends of the centre line have a 0.9 m radius.",
      "Net height at the centre: 1.52 m for men and 1.42 m for women.",
    ],
  },
  {
    title: "Scoring",
    icon: "trophy-outline" as const,
    items: [
      "Rally scoring: a point is scored on every rally regardless of serving team.",
      "A set is won by the first regu to reach 15 points.",
      "At 14–14, play continues until a regu leads by two or reaches the 17-point cap.",
    ],
  },
  {
    title: "Serving",
    icon: "arrow-up-outline" as const,
    items: [
      "Before service, the Tekong's non-kicking foot must be inside the service circle; the Inside players stand in their quarter circles.",
      "The receiving regu may stand anywhere within its court.",
      "A team may touch the ball up to three times before sending it over.",
    ],
  },
  {
    title: "Common Fouls",
    icon: "warning-outline" as const,
    items: [
      "Touching the ball with an arm or holding it against the body.",
      "Touching the net, post, or crossing into the opponent's court (except in a follow-through).",
      "Four or more touches by the same team.",
      "A Tekong lifting or stepping the non-kicking foot outside the service circle before contact.",
    ],
  },
];

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const courtWidth = Math.min(Math.max(width - spacing.lg * 4, 260), 640);
  const courtHeight = courtWidth * (6.1 / 13.4);
  const quarterDiameter = courtWidth * (1.8 / 13.4);
  const serviceDiameter = courtWidth * (0.6 / 13.4);
  const serviceTop = courtHeight / 2 - serviceDiameter / 2;
  const leftService = courtWidth * (2.45 / 13.4) - serviceDiameter / 2;
  const rightService = courtWidth * (1 - 2.45 / 13.4) - serviceDiameter / 2;
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Rules & Court</Text>
      </View>
      <ScrollView testID="rules-scroll-view" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text testID="rules-intro" style={styles.lead}>ISTAF 2024 quick reference for new players. Check event regulations for any local variations.</Text>

        <View testID="istaf-court-diagram" style={styles.courtBox}>
          <Text testID="court-dimensions" style={styles.courtLabel}>ISTAF COURT · 13.4 m × 6.1 m</Text>
          <View style={[styles.court, { width: courtWidth, height: courtHeight }]}> 
            <View style={[styles.centerLine, { left: courtWidth / 2 - 1 }]} />
            <View style={[styles.quarterCircle, { width: quarterDiameter, height: quarterDiameter, left: courtWidth / 2 - quarterDiameter / 2, top: -quarterDiameter / 2 }]} />
            <View style={[styles.quarterCircle, { width: quarterDiameter, height: quarterDiameter, left: courtWidth / 2 - quarterDiameter / 2, bottom: -quarterDiameter / 2 }]} />
            <View style={[styles.serviceCircle, { width: serviceDiameter, height: serviceDiameter, left: leftService, top: serviceTop }]} />
            <View style={[styles.serviceLine, { width: serviceDiameter, left: leftService, top: courtHeight / 2 - 1 }]} />
            <View style={[styles.serviceCircle, { width: serviceDiameter, height: serviceDiameter, left: rightService, top: serviceTop }]} />
            <View style={[styles.serviceLine, { width: serviceDiameter, left: rightService, top: courtHeight / 2 - 1 }]} />
          </View>
          <Text testID="court-markings-note" style={styles.courtFoot}>Service circles · 0.3 m radius  |  Quarter circles · 0.9 m radius</Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} testID={`rules-section-${s.title.toLowerCase().replaceAll(" ", "-")}`} style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <Ionicons name={s.icon} size={18} color={colors.brandSecondary} />
              </View>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>
            {s.items.map((t) => (
              <View key={t} style={styles.bullet}>
                <View style={styles.dot} />
              <Text testID={`rule-${s.title.toLowerCase().replaceAll(" ", "-")}-${s.items.indexOf(t) + 1}`} style={styles.bulletText}>{t}</Text>
              </View>
            ))}
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
  lead: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },

  courtBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  courtLabel: { color: colors.finePrint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  court: {
    marginVertical: spacing.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 2, borderColor: colors.onSurface,
    overflow: "hidden",
    position: "relative",
  },
  centerLine: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: colors.onSurface, zIndex: 2 },
  quarterCircle: { position: "absolute", borderRadius: 999, borderWidth: 2, borderColor: colors.onSurface },
  serviceCircle: { position: "absolute", borderRadius: 999, borderWidth: 2, borderColor: colors.onSurface },
  serviceLine: { position: "absolute", height: 2, backgroundColor: colors.onSurface },
  courtFoot: { color: colors.muted, fontSize: 12, textAlign: "center" },

  section: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.md },
  sectionIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  bullet: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brandSecondary, marginTop: 7 },
  bulletText: { color: colors.onSurface, fontSize: 13, flex: 1, lineHeight: 20 },
});
