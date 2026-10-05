import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";

type Row = { key: string; title: string; subtitle: string; icon: any; route: any };

const ROWS: Row[] = [
  { key: "notifications", title: "Notifications", subtitle: "In-app history", icon: "notifications-outline", route: "/notifications" },
  { key: "enquiry", title: "Enquiry", subtitle: "Reach the MSTC team", icon: "mail-outline", route: "/enquiry" },
  { key: "website", title: "MSTC Website", subtitle: "Open the main site", icon: "globe-outline", route: "/website" },
  { key: "about", title: "About MSTConnect", subtitle: "Mission & info", icon: "information-circle-outline", route: "/about" },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <BackgroundGlow />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg }}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Other MSTConnect features</Text>

        <View style={styles.freeBanner} testID="free-banner">
          <Ionicons name="sparkles" size={14} color={colors.onBrandSecondary} />
          <Text style={styles.freeText}>ALWAYS FREE — Community-driven</Text>
        </View>

        <View style={styles.list}>
          {ROWS.map((r, i) => (
            <Pressable
              key={r.key}
              testID={`more-${r.key}`}
              style={[styles.row, i < ROWS.length - 1 && styles.rowDivider]}
              onPress={() => router.push(r.route)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={r.icon} size={20} color={colors.brandSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{r.title}</Text>
                <Text style={styles.rowSub}>{r.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
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
  freeBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
    marginBottom: spacing.lg,
  },
  freeText: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  list: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  rowTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
