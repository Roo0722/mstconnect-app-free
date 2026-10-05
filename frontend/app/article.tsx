import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, type Block } from "../src/api";
import { colors, spacing, radius } from "../src/theme";
import { BackgroundGlow } from "../src/BackgroundGlow";

export default function ArticleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { url, title, date, category } = useLocalSearchParams<{ url: string; title?: string; date?: string; category?: string }>();
  const q = useQuery({ queryKey: ["article", url], queryFn: () => api.getArticle(String(url)), enabled: !!url });

  const blocks: Block[] = q.data ?? [];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{category ? String(category).toUpperCase() : "ANNOUNCEMENT"}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}>
        <Text style={styles.title}>{title}</Text>
        {date ? <Text style={styles.date}>{date}</Text> : null}

        {q.isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} /> : null}

        {blocks.map((b, i) => {
          switch (b.type) {
            case "img":
              return <Image key={i} source={{ uri: b.src }} style={styles.img} contentFit="cover" transition={150} />;
            case "h":
              return <Text key={i} style={styles.h}>{b.text}</Text>;
            case "li":
              return (
                <View key={i} style={styles.liRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.p}>{b.text}</Text>
                </View>
              );
            case "quote":
              return <Text key={i} style={styles.quote}>{b.text}</Text>;
            default:
              return <Text key={i} style={styles.p}>{b.text}</Text>;
          }
        })}

        {!q.isLoading && (q.isError || blocks.length === 0) ? (
          <View style={styles.errBox}>
            <Text style={styles.p}>
              {q.isError ? "Couldn't load this post. Check your internet connection." : "This post has no readable text here."}
            </Text>
            <Pressable
              style={styles.cta}
              onPress={() => router.push({ pathname: "/website", params: { u: String(url) } })}
            >
              <Ionicons name="globe-outline" size={18} color={colors.onBrandPrimary} />
              <Text style={styles.ctaText}>View it inside the app</Text>
            </Pressable>
            {q.isError ? (
              <Pressable onPress={() => q.refetch()}>
                <Text style={styles.retry}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: { color: colors.brandSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "900", lineHeight: 32 },
  date: { color: colors.finePrint, fontSize: 12 },
  h: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: spacing.sm },
  p: { color: colors.muted, fontSize: 15, lineHeight: 23, flexShrink: 1 },
  liRow: { flexDirection: "row", gap: 8, paddingLeft: 4 },
  bullet: { color: colors.brandSecondary, fontSize: 15, lineHeight: 23 },
  quote: {
    color: colors.onSurface, fontSize: 15, lineHeight: 23, fontStyle: "italic",
    borderLeftWidth: 3, borderLeftColor: colors.brandPrimary, paddingLeft: spacing.md,
  },
  img: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary },
  errBox: { gap: spacing.md, alignItems: "flex-start", marginTop: spacing.md },
  cta: {
    flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.pill,
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  retry: { color: colors.brandPrimary, fontWeight: "800", fontSize: 14 },
});
