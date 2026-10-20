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

// Home tab: your rank, this week at a glance. One tap opens Rank & Plan (where the week is edited).
export const HomeRank = memo(function HomeRank() {
  const router = useRouter();
  const { game: g } = useGame();
  const { plan, week, trained } = usePlanWeek();
  const rank = RANKS[g.level - 1];
  const frac = g.divisionSize ? Math.min(1, g.within / g.divisionSize) : 1;
  const fresh = g.rawRP === 0 && !plan.set;

  return (
    <Pressable
      onPress={() => router.push("/training")}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`${g.rankName}${g.division ? ` ${g.division}` : ""}. Open Rank and Plan.`}
      testID="home-rank-card"
    >
      <View style={s.top}>
        <Text style={s.eyebrow}>PLAYER RANK</Text>
        <Text style={s.eyebrow}>LEVEL {g.level} OF 8</Text>
      </View>

      <View style={s.hero}>
        <Image source={EMBLEMS[g.level - 1]} style={s.emblem} contentFit="contain" transition={250} />
        <View style={s.heroText}>
          <Text style={s.name} numberOfLines={2}>
            {g.rankName}
            {g.division ? ` ${g.division}` : ""}
          </Text>
          <Text style={s.role} numberOfLines={2}>{rank.role}</Text>
          {g.division ? (
            <>
              <View style={s.between}>
                <Text style={s.small}>{g.held ? "Bar full" : `${g.within} / ${g.divisionSize} RP`}</Text>
                <Text style={s.small}>{g.rawRP.toLocaleString()} RP</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${Math.round(frac * 100)}%` }]} />
              </View>
            </>
          ) : (
            <Text style={s.small}>{g.rawRP.toLocaleString()} RP this season</Text>
          )}
        </View>
      </View>

      <View style={s.chips}>
        <View style={s.chip}>
          <Ionicons name="flame" size={16} color={g.week.streakReached ? colors.brandSecondary : colors.muted} />
          <View>
            <Text style={s.chipLabel}>STREAK</Text>
            <Text style={s.chipText}>{g.week.streakWeeks > 0 ? `${g.week.streakWeeks} ${g.week.streakWeeks === 1 ? "week" : "weeks"}` : "None yet"}</Text>
          </View>
        </View>
        <View style={s.chip}>
          <Ionicons name="time-outline" size={16} color={colors.muted} />
          <View>
            <Text style={s.chipLabel}>THIS WEEK</Text>
            <Text style={s.chipText}>{g.week.minutes} min</Text>
          </View>
        </View>
      </View>

      <View style={s.weekBox}>
        <Text style={s.weekTitle}>WEEKLY ACTIVITY · VIEW ONLY</Text>
        <WeekStrip week={week} trained={trained} plan={plan} legend />
      </View>

      <View style={s.cta}>
        <Text style={s.ctaText}>{fresh ? "SET YOUR WEEK & START" : "OPEN RANK & PLAN"}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.onBrandSecondary} />
      </View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.brandSecondary, gap: 10, marginBottom: spacing.md },
  top: { flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: colors.brandSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  emblem: { width: 104, height: 100 },
  heroText: { flex: 1, gap: 3 },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: "900", lineHeight: 26 },
  role: { color: colors.muted, fontSize: 12 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.brandSecondary },
  between: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  small: { color: colors.muted, fontSize: 11 },
  chips: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  chipLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  chipText: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  weekBox: { gap: 8 },
  weekTitle: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.brandSecondary, borderRadius: radius.md, minHeight: 46, paddingHorizontal: spacing.md },
  ctaText: { color: colors.onBrandSecondary, fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
});
