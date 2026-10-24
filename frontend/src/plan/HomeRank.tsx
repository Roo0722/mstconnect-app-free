import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../theme";
import { RANKS } from "../game/config";
import { EMBLEMS } from "../game/emblems";
import { useGame } from "../game/store";
import { WeekStrip, usePlanWeek } from "./ui";

// Home tab, top part: the round rank medal (tap to open Rank & Plan) beside a compact level card.
export const HomeRank = memo(function HomeRank({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { game: g } = useGame();
  const rank = RANKS[g.level - 1];
  const frac = g.divisionSize ? Math.min(1, g.within / g.divisionSize) : 1;
  const name = `${g.rankName}${g.division ? ` ${g.division}` : ""}`;
  const medal = compact ? 84 : 104;
  const toGo = Math.max(0, g.divisionSize - g.within);
  const next = g.held ? "Promotion series next" : `${toGo} RP to ${g.division === "I" ? "next rank" : "next division"}`;
  const open = () => router.push("/training");

  return (
    <View style={s.row}>
      <Pressable onPress={open} style={s.medalCol} accessibilityRole="button" accessibilityLabel={`${name}. Tap to view rank details.`} testID="home-rank-medal">
        <View style={[s.medal, { width: medal, height: medal, borderRadius: medal / 2 }]}>
          <Image source={EMBLEMS[g.level - 1]} style={{ width: medal - 10, height: medal - 10 }} contentFit="contain" transition={250} />
        </View>
        {!compact ? (
          <>
            <Text style={s.medalLabel}>RANK</Text>
            <Text style={s.medalHint}>Tap for details</Text>
          </>
        ) : null}
      </Pressable>

      <Pressable onPress={open} style={s.card} accessibilityRole="button" accessibilityLabel={`${name}. Open Rank and Plan.`} testID="home-rank-card">
        <View style={s.between}>
          <Text style={s.eyebrow}>LEVEL {g.level} / 8</Text>
          <Text style={s.rp}>{g.rawRP.toLocaleString()} RP</Text>
        </View>
        <Text style={s.name} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
        {!compact ? <Text style={s.role} numberOfLines={1}>{rank.role}</Text> : null}
        {g.division ? (
          <>
            <View style={s.track}>
              <View style={[s.fill, { width: `${Math.round(frac * 100)}%` }]} />
            </View>
            <Text style={s.small} numberOfLines={1}>{next}</Text>
          </>
        ) : null}
        <View style={s.chips}>
          <View style={s.chip}>
            <Ionicons name="flame" size={15} color={g.week.streakReached ? colors.brandSecondary : colors.muted} />
            <View>
              <Text style={s.chipLabel}>STREAK</Text>
              <Text style={s.chipText}>{g.week.streakWeeks > 0 ? `${g.week.streakWeeks} ${g.week.streakWeeks === 1 ? "wk" : "wks"}` : "0 days"}</Text>
            </View>
          </View>
          <View style={s.chip}>
            <Ionicons name="time-outline" size={15} color={colors.muted} />
            <View>
              <Text style={s.chipLabel}>THIS WEEK</Text>
              <Text style={s.chipText}>{g.week.minutes} min</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

// Home tab: this week at a glance, view only. Tap to open Rank & Plan where it is edited.
export const HomeWeek = memo(function HomeWeek({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { game: g } = useGame();
  const { plan, week, trained } = usePlanWeek();
  return (
    <Pressable onPress={() => router.push("/training")} style={[s.weekCard, compact && { paddingVertical: 8 }]} accessibilityRole="button" accessibilityLabel="Weekly activity. Open Rank and Plan." testID="home-week">
      <View style={s.between}>
        <View style={s.weekTitle}>
          <Ionicons name="calendar-outline" size={15} color={colors.brandSecondary} />
          <Text style={s.eyebrow}>WEEKLY ACTIVITY</Text>
        </View>
        <View style={s.weekTitle}>
          <Text style={s.season}>{g.seasonSpan.toUpperCase()}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brandSecondary} />
        </View>
      </View>
      <WeekStrip week={week} trained={trained} plan={plan} />
    </Pressable>
  );
});

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  medalCol: { alignItems: "center", justifyContent: "center", gap: 2 },
  medal: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.brandSecondary, backgroundColor: colors.surfaceSecondary },
  medalLabel: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, marginTop: 2 },
  medalHint: { color: colors.muted, fontSize: 10 },
  card: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.brandSecondary, gap: 4, justifyContent: "center" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: colors.brandSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  rp: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  role: { color: colors.muted, fontSize: 12 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, overflow: "hidden", marginTop: 2 },
  fill: { height: "100%", backgroundColor: colors.brandSecondary },
  small: { color: colors.muted, fontSize: 11 },
  chips: { flexDirection: "row", gap: 6, marginTop: 4 },
  chip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 5 },
  chipLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  weekCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, gap: 8 },
  weekTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  season: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
});
