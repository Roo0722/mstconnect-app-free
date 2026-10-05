import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api, SITE_URL, type Announcement } from "../../src/api";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

const CATEGORY_LABEL: Record<Announcement["category"], string> = {
  event: "EVENT",
  recruitment: "RECRUITMENT",
  training: "TRAINING",
  community: "COMMUNITY",
};

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const q = useQuery({ queryKey: ["announcements"], queryFn: api.listAnnouncements });

  return (
    <View style={styles.root}>
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Announcements</Text>
        <Text style={styles.subtitle}>Latest from MSTC — newest first</Text>
      </View>
      {q.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <FlatList
          testID="announcements-list"
          data={q.data ?? []}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={colors.brandPrimary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No announcements to show.</Text>
              <Pressable onPress={() => router.push({ pathname: "/website", params: { u: `${SITE_URL}/announcements` } })} style={{ marginTop: spacing.md }}>
                <Text style={[styles.emptyText, { color: colors.brandPrimary, fontWeight: "800" }]}>View announcements inside the app</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              testID={`announcement-${item.id}`}
              onPress={() =>
                item.url &&
                router.push({
                  pathname: "/article",
                  params: { url: item.url, title: item.title, date: formatDate(item.created_at), category: item.category },
                })
              }
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumb} contentFit="cover" transition={150} />
              ) : null}
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{CATEGORY_LABEL[item.category]}</Text>
                </View>
                {item.pinned && (
                  <View style={[styles.tag, { backgroundColor: colors.brandSecondary }]}>
                    <Text style={[styles.tagText, { color: colors.onBrandSecondary }]}>PINNED</Text>
                  </View>
                )}
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              {item.url ? <Text style={styles.readMore}>Read more →</Text> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "900", letterSpacing: 0.3 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  tag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
  },
  tagText: { color: colors.onBrandTertiary, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  date: { color: colors.finePrint, fontSize: 11, marginLeft: "auto" },
  cardTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginBottom: 6 },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  thumb: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: colors.surfaceSecondary },
  readMore: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800", marginTop: spacing.sm },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.muted },
});
