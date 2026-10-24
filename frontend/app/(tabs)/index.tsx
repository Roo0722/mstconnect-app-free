import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter, useFocusEffect } from "expo-router";
import { api, pickCancelledNotice, type MstcEvent } from "../../src/api";
import { colors, spacing, radius } from "../../src/theme";
import { BackgroundGlow } from "../../src/BackgroundGlow";
import { HomeRank, HomeWeek } from "../../src/plan/HomeRank";
import { OfflineNote } from "../../src/OfflineNote";

function useCountdown(targetIso?: string | null, durationMin: number = 120) {
  const [now, setNow] = useState(() => Date.now());
  // tick only while this tab is on screen (the tab stays mounted when you switch away)
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, []),
  );
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

function EventCard({ event, compact, onPress }: { event: MstcEvent | null | undefined; compact: boolean; onPress?: () => void }) {
  const countdown = useCountdown(event?.starts_at, event?.duration_minutes ?? 120);

  if (!event) {
    return (
      <View style={styles.card} testID="next-event-card">
        <View style={styles.rowTop}>
          <Ionicons name="calendar-outline" size={18} color={colors.brandSecondary} />
          <Text style={styles.eyebrow}>NEXT MSTC EVENT</Text>
          <View style={[styles.pill, { backgroundColor: colors.surfaceTertiary }]}>
            <Text style={[styles.pillText, { color: colors.muted }]}>NOT SCHEDULED</Text>
          </View>
        </View>
        <Text style={styles.eventTitle}>No upcoming event yet</Text>
        <Text style={styles.meta}>New community sessions will appear here. Date: TBD</Text>
      </View>
    );
  }

  const live = countdown.state === "live";
  const meta = [event.date, event.time, compact ? null : event.location].filter(Boolean).join("  ·  ");

  return (
    <Pressable style={styles.card} testID="next-event-card" onPress={onPress} disabled={!onPress}>
      <View style={styles.rowTop}>
        <Ionicons name="calendar-outline" size={18} color={colors.brandSecondary} />
        <Text style={styles.eyebrow}>NEXT MSTC EVENT</Text>
        <View style={[styles.pill, live && { backgroundColor: colors.brandPrimary }]}>
          <Text style={[styles.pillText, live && { color: colors.onBrandPrimary }]}>{live ? "LIVE" : "UPCOMING"}</Text>
        </View>
      </View>
      <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
      {countdown.state === "counting" ? (
        <View style={styles.timerRow}>
          <TimeBlock label="DAYS" value={countdown.days} compact={compact} />
          <TimeBlock label="HRS" value={countdown.hours} compact={compact} />
          <TimeBlock label="MIN" value={countdown.mins} compact={compact} />
          <TimeBlock label="SEC" value={countdown.secs} compact={compact} />
        </View>
      ) : live ? (
        <Text style={styles.liveLine}>Event in progress</Text>
      ) : countdown.state === "tbd" ? (
        <Text style={styles.tbdLine}>Date and time to be announced</Text>
      ) : null}
      {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
    </Pressable>
  );
}

function TimeBlock({ label, value, compact }: { label: string; value: number; compact: boolean }) {
  return (
    <View style={styles.timeBlock}>
      <Text style={[styles.timeValue, compact && { fontSize: 22 }]}>{String(value).padStart(2, "0")}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );
}

// Home is a fixed dashboard: it never scrolls. It measures the space it really has and tightens up
// (smaller medal, fewer details) before anything could be pushed off screen.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const [room, setRoom] = useState(0); // height available for the dashboard, in dp
  const eventQ = useQuery({ queryKey: ["next-event"], queryFn: api.nextEvent });
  const annQ = useQuery({ queryKey: ["announcements"], queryFn: api.listAnnouncements });
  const allEventsQ = useQuery({ queryKey: ["events"], queryFn: api.listEvents });
  const notifQ = useQuery({ queryKey: ["notifications"], queryFn: api.listNotifications });
  const cancelled = useMemo(() => pickCancelledNotice(allEventsQ.data ?? []), [allEventsQ.data]);

  // no pull-to-refresh on a fixed screen: refresh quietly when you come back to Home
  useFocusEffect(
    useCallback(() => {
      for (const q of [eventQ, annQ, allEventsQ, notifQ]) if (Date.now() - q.dataUpdatedAt > 60_000) q.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const latest = annQ.data?.[0];
  const unreadCount = (notifQ.data ?? []).filter((n) => !n.read).length;
  const big = fontScale > 1.15;
  const compact = (room > 0 && room < 640) || big;
  const tight = (room > 0 && room < 560) || fontScale > 1.4;

  return (
    <View style={styles.root} onLayout={(e) => setRoom(e.nativeEvent.layout.height - insets.top)}>
      <BackgroundGlow />
      <View style={[styles.body, { paddingTop: insets.top + spacing.sm, gap: compact ? 6 : spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTag}>MSTConnect</Text>
            <Text style={styles.brandSub} numberOfLines={1}>Malitbog Sepak Takraw Community</Text>
            <View style={styles.freeChip} testID="free-badge">
              <Ionicons name="sparkles" size={11} color={colors.brandSecondary} />
              <Text style={styles.freeChipText}>ALWAYS FREE · NO JOINING FEE</Text>
            </View>
          </View>
          <Pressable testID="header-notifications-btn" onPress={() => router.push("/notifications")} style={styles.bellBtn} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <OfflineNote />
        <HomeRank compact={compact} />
        <HomeWeek compact={compact} />

        {cancelled.slice(0, 1).map((e) => (
          <Pressable
            key={e.id}
            style={styles.cancelNote}
            testID="cancelled-event-note"
            onPress={() => e.url && router.push({ pathname: "/article", params: { url: e.url, title: e.title, date: e.date ?? "", category: "event" } })}
            accessibilityRole="button"
            accessibilityLabel={`Cancelled event: ${e.title}${e.date ? `, ${e.date}` : ""}${e.cancel_reason ? `. ${e.cancel_reason}` : ""}`}
          >
            <Ionicons name="close-circle" size={16} color={colors.brandPrimary} />
            <Text style={styles.cancelText} numberOfLines={1}>
              <Text style={styles.cancelLabel}>CANCELLED  </Text>
              <Text style={{ textDecorationLine: "line-through" }}>{e.title}</Text>
              {e.cancel_reason ? `  ·  ${e.cancel_reason}` : ""}
            </Text>
          </Pressable>
        ))}

        {eventQ.isLoading ? (
          <View style={[styles.card, { alignItems: "center", justifyContent: "center", minHeight: 96 }]}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : (
          <EventCard
            event={eventQ.data ?? null}
            compact={compact}
            onPress={
              eventQ.data?.url
                ? () => router.push({ pathname: "/article", params: { url: eventQ.data!.url!, title: eventQ.data!.title, date: eventQ.data!.date ?? "", category: "event" } })
                : undefined
            }
          />
        )}

        <View style={styles.annSlot}>
          {annQ.isLoading ? (
            <ActivityIndicator color={colors.brandPrimary} />
          ) : latest ? (
            <Pressable testID="latest-announcement-card" style={styles.card} onPress={() => router.push("/news")}>
              <View style={styles.rowTop}>
                <Ionicons name="megaphone-outline" size={18} color={colors.brandSecondary} />
                <Text style={styles.eyebrow}>LATEST ANNOUNCEMENT</Text>
                {latest.pinned ? (
                  <View style={[styles.pill, { backgroundColor: colors.brandSecondary }]}>
                    <Text style={[styles.pillText, { color: colors.onBrandSecondary }]}>PINNED</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.annTitle} numberOfLines={tight ? 1 : 2}>{latest.title}</Text>
              {!tight ? <Text style={styles.annBody} numberOfLines={compact ? 1 : 2}>{latest.body}</Text> : null}
            </Pressable>
          ) : (
            <Text style={styles.muted}>No announcements yet.</Text>
          )}
        </View>

        <Pressable testID="quick-enquiry" style={styles.enquiry} onPress={() => router.push("/enquiry")} accessibilityRole="button">
          <Ionicons name="mail-outline" size={22} color={colors.brandSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.enquiryTitle}>Enquiry</Text>
            {!tight ? <Text style={styles.meta} numberOfLines={1}>Contact the MSTC community</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.brandSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, overflow: "hidden" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandTag: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  brandSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  freeChip: {
    alignSelf: "flex-start", flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brandSecondary, marginTop: 6,
  },
  freeChipText: { color: colors.brandSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  bellBtn: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  bellBadge: {
    position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center",
  },
  bellBadgeText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "700" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { color: colors.brandSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1.3, flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  pillText: { color: colors.onSurface, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  eventTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  timerRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  timeBlock: { flex: 1, alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 4 },
  timeValue: { color: colors.onSurface, fontSize: 28, fontWeight: "900", letterSpacing: 1 },
  timeLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  tbdLine: { color: colors.brandSecondary, fontSize: 14, fontWeight: "700" },
  liveLine: { color: colors.brandPrimary, fontSize: 18, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 12 },
  cancelNote: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: colors.brandPrimary,
  },
  cancelText: { flex: 1, color: colors.muted, fontSize: 12 },
  cancelLabel: { color: colors.brandPrimary, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  annSlot: { flexShrink: 1, minHeight: 0, justifyContent: "center", overflow: "hidden" },
  annTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  annBody: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  muted: { color: colors.muted, fontSize: 13 },
  enquiry: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, minHeight: 52, borderWidth: 1, borderColor: colors.border,
  },
  enquiryTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
});
