import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";

type Tool = { key: string; title: string; subtitle: string; icon: any; route: any; accent: "red" | "yellow" };

const TOOLS: Tool[] = [
  { key: "timer", title: "Training Timer", subtitle: "Rounds & rest intervals", icon: "stopwatch-outline", route: "/tools/timer", accent: "red" },
  { key: "warmup", title: "Warm-Up Guide", subtitle: "5-min guided routine", icon: "flame-outline", route: "/tools/warmup", accent: "yellow" },
  { key: "score", title: "Score Counter", subtitle: "Team A vs Team B", icon: "trophy-outline", route: "/tools/score", accent: "red" },
  { key: "rules", title: "Rules & Court", subtitle: "Quick reference", icon: "book-outline", route: "/tools/rules", accent: "yellow" },
];

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <BackgroundGlow />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg }}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>Everything you need, courtside.</Text>
        <View style={styles.grid}>
          {TOOLS.map((t) => (
            <Pressable
              key={t.key}
              testID={`tool-${t.key}`}
              style={styles.card}
              onPress={() => router.push(t.route)}
            >
              <View style={[styles.iconWrap, t.accent === "red" ? styles.iconRed : styles.iconYellow]}>
                <Ionicons name={t.icon} size={22} color={t.accent === "red" ? colors.brandPrimary : colors.brandSecondary} />
              </View>
              <Text style={styles.cardTitle}>{t.title}</Text>
              <Text style={styles.cardSub}>{t.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "900", letterSpacing: 0.3 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    flexBasis: "48%", flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    gap: 10,
    minHeight: 130,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  iconRed: { backgroundColor: colors.brandTertiary },
  iconYellow: { backgroundColor: "rgba(252, 209, 22, 0.15)" },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  cardSub: { color: colors.muted, fontSize: 12 },
});
