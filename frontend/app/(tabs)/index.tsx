import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { api, type MstcEvent } from "../../src/api";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";

function useCountdown(targetIso?: string | null, durationMin: number = 120) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    if (!targetIso) return { state: "tbd" as const };
    const target = new Date(targetIso).getTime();
    if (Number.isNaN(target)) return { state: "tbd" as const };
    const diffMs = target - now;
    const endMs = target + durationMin * 60_000;
    if (now >= target && now < endMs) {
      return { state: "live" as const };
    }
    if (diffMs <= 0) return { state: "past" as const };
    const totalSec = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return { state: "counting" as const, days, hours, mins, secs };
  }, [targetIso, now, durationMin]);
}

function EventCard({ event, onPress }: { event: MstcEvent | null | undefined; onPress?: () => void }) {
  const countdown = useCountdown(event?.starts_at, event?.duration_minutes ?? 120);
  const title = event?.title ?? "No upcoming event yet";
  const location = event?.location ?? "TBD";
  const date = event?.date ?? "TBD";
  const time = event?.time ?? "TBD";

  const noEvent = !event;
  const live = countdown.state === "live";

  return (
    <Pressable style={styles.hero} testID="next-event-card" onPress={onPress} disabled={!onPress}>
      <View style={styles.heroTopRow}>
        <Text style={styles.heroEyebrow}>NEXT MSTC EVENT</Text>
        <View
          style={[
            styles.statusPill,
            live && { backgroundColor: colors.brandPrimary },
            noEvent && { backgroundColor: colors.surfaceTertiary },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: live ? colors.onBrandPrimary : noEvent ? colors.muted : colors.brandSecondary },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              live && { color: colors.onBrandPrimary },
              noEvent && { color: colors.muted },
            ]}
          >
            {live ? "LIVE" : noEvent ? "NONE" : "UPCOMING"}
          </Text>
        </View>
      </View>

      <Text style={styles.heroTitle} numberOfLines={2}>
        {title}
      </Text>

      {noEvent ? (
        <Text style={styles.noEvent}>Check back soon — new sessions post here.</Text>
      ) : countdown.state === "tbd" ? (
        <Text style={styles.tbdLine}>Date & time to be announced</Text>
      ) : live ? (
        <Text style={styles.liveLine}>Event in Progress</Text>
      ) : countdown.state === "counting" ? (
        <View style={styles.timerRow}>
          <TimeBlock label="DAYS" value={countdown.days} />
          <Text style={styles.colon}>:</Text>
          <TimeBlock label="HRS" value={countdown.hours} />
          <Text style={styles.colon}>:</Text>
          <TimeBlock label="MIN" value={countdown.mins} />
          <Text style={styles.colon}>:</Text>
          <TimeBlock label="SEC" value={countdown.secs} />
        </View>
      ) : null}

      <View style={styles.heroMeta}>
        <MetaRow icon="calendar-outline" text={date} />
        <MetaRow icon="time-outline" text={time} />
        <MetaRow icon="location-outline" text={location} />
      </View>
    </Pressable>
  );
}

function TimeBlock({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.timeValue}>{String(value).padStart(2, "0")}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );
}

function MetaRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const eventQ = useQuery({ queryKey: ["next-event"], queryFn: api.nextEvent });
  const annQ = useQuery({ queryKey: ["announcements"], queryFn: api.listAnnouncements });
  const notifQ = useQuery({ queryKey: ["notifications"], queryFn: api.listNotifications });

  const refreshing = eventQ.isRefetching || annQ.isRefetching || notifQ.isRefetching;
  const onRefresh = () => {
    eventQ.refetch();
    annQ.refetch();
    notifQ.refetch();
  };

  const latest = annQ.data?.[0];
  const unreadCount = (notifQ.data ?? []).filter((n) => !n.read).length;

  return (
    <View style={styles.root}>
      <BackgroundGlow />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} colors={[colors.brandPrimary]} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTag}>MSTConnect</Text>
            <Text style={styles.brandSub}>Malitbog Sepak Takraw Community</Text>
          </View>
          <Pressable
            testID="header-notifications-btn"
            onPress={() => router.push("/notifications")}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.freeChip} testID="free-badge">
          <Ionicons name="sparkles" size={12} color={colors.onBrandSecondary} />
          <Text style={styles.freeChipText}>ALWAYS FREE · NO JOINING FEE</Text>
        </View>

        {eventQ.isLoading ? (
          <View style={styles.loadingHero}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : (
          <EventCard
            event={eventQ.data ?? null}
            onPress={
              eventQ.data?.url
                ? () =>
                    router.push({
                      pathname: "/article",
                      params: { url: eventQ.data!.url!, title: eventQ.data!.title, date: eventQ.data!.date ?? "", category: "event" },
                    })
                : undefined
            }
          />
        )}

        <Text style={styles.sectionLabel}>LATEST ANNOUNCEMENT</Text>
        {annQ.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} />
        ) : latest ? (
          <Pressable
            testID="latest-announcement-card"
            style={styles.annCard}
            onPress={() => router.push("/news")}
          >
            <View style={styles.annTagRow}>
              <View style={styles.annTag}>
                <Text style={styles.annTagText}>{latest.category.toUpperCase()}</Text>
              </View>
              {latest.pinned && (
                <View style={[styles.annTag, { backgroundColor: colors.brandSecondary }]}>
                  <Text style={[styles.annTagText, { color: colors.onBrandSecondary }]}>PINNED</Text>
                </View>
              )}
            </View>
            <Text style={styles.annTitle}>{latest.title}</Text>
            <Text style={styles.annBody} numberOfLines={3}>{latest.body}</Text>
            <View style={styles.annFooter}>
              <Text style={styles.annRead}>Read more</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.brandSecondary} />
            </View>
          </Pressable>
        ) : (
          <Text style={styles.muted}>No announcements yet.</Text>
        )}

        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          <QuickTile icon="megaphone-outline" label="All News" onPress={() => router.push("/news")} testID="quick-news" />
          <QuickTile icon="construct-outline" label="Tools" onPress={() => router.push("/tools")} testID="quick-tools" />
          <QuickTile icon="mail-outline" label="Enquiry" onPress={() => router.push("/enquiry")} testID="quick-enquiry" />
          <QuickTile icon="globe-outline" label="Website" onPress={() => router.push("/website")} testID="quick-website" />
        </View>
      </ScrollView>
    </View>
  );
}

function QuickTile({ icon, label, onPress, testID }: { icon: any; label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} style={styles.quickTile} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.brandSecondary} />
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  brandTag: {
    color: colors.onSurface,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  brandSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  bellBtn: {
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  bellBadge: {
    position: "absolute", top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  bellBadgeText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "700" },
  freeChip: {
    alignSelf: "flex-start",
    flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
    marginBottom: spacing.lg,
  },
  freeChipText: { color: colors.onBrandSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  loadingHero: {
    height: 220, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  hero: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  heroEyebrow: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.onSurface, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  heroTitle: {
    color: colors.onSurface,
    fontSize: 24, fontWeight: "900",
    letterSpacing: 0.3, marginBottom: spacing.md,
  },
  timerRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: spacing.md },
  timeBlock: { alignItems: "center", flex: 1 },
  timeValue: { color: colors.onSurface, fontSize: 36, fontWeight: "900", letterSpacing: 1 },
  timeLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginTop: -2 },
  colon: { color: colors.brandSecondary, fontSize: 28, fontWeight: "900", paddingBottom: 14 },
  tbdLine: { color: colors.brandSecondary, fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  liveLine: { color: colors.brandPrimary, fontSize: 20, fontWeight: "900", marginBottom: spacing.md },
  noEvent: { color: colors.muted, fontSize: 13, marginBottom: spacing.md },
  heroMeta: { gap: 6, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { color: colors.muted, fontSize: 13, flex: 1 },
  sectionLabel: {
    color: colors.finePrint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4,
    marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  annCard: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  annTagRow: { flexDirection: "row", gap: 6, marginBottom: spacing.sm },
  annTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
  },
  annTagText: { color: colors.onBrandTertiary, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  annTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginBottom: 6 },
  annBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  annFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
  annRead: { color: colors.brandSecondary, fontSize: 12, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 13 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickTile: {
    flexBasis: "48%", flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "flex-start",
    gap: 10,
  },
  quickLabel: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
});
