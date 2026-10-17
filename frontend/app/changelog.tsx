import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../src/theme";
import { BackgroundGlow } from "../src/BackgroundGlow";
import { CHANGELOG } from "../src/changelog";
import { markChangelogSeen } from "../src/changelogSeen";
import { channel, installedBuild, installedVersion } from "../src/update";

export default function ChangelogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const build = installedBuild();

  useEffect(() => {
    markChangelogSeen();
  }, []);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">What's New</Text>
          <Text style={styles.subtitle}>
            You have version {installedVersion() || "-"}{channel() === "beta" ? " (beta)" : ""}{build ? ` · build ${build}` : ""}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}>
        {CHANGELOG.map((c, i) => (
          <View key={c.id} style={[styles.card, i === 0 && styles.cardLatest]}>
            <View style={styles.cardTop}>
              <Text style={styles.date}>{c.date.toUpperCase()}</Text>
              {c.tag ? (
                <View style={[styles.tag, c.tag === "Beta" && styles.tagBeta]}>
                  <Text style={[styles.tagText, c.tag === "Beta" && styles.tagTextBeta]}>{c.tag.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              {c.items.map((t, k) => (
                <View key={k} style={styles.itemRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.item}>{t}</Text>
                </View>
              ))}
            </View>
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
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: 4 },
  cardLatest: { borderColor: colors.brandSecondary },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  tag: { backgroundColor: colors.brandTertiary, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  tagBeta: { backgroundColor: "rgba(252, 209, 22, 0.18)" },
  tagText: { color: colors.brandPrimary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  tagTextBeta: { color: colors.brandSecondary },
  cardTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  itemRow: { flexDirection: "row", gap: 8 },
  bullet: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  item: { flex: 1, color: colors.onSurface, fontSize: 14, lineHeight: 20 },
});
