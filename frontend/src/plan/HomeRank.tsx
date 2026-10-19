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
        <Text style={s.eyebrow}>LEVEL {g.level} OF 8</Text>
        <Text style={s.eyebrow}>{g.seasonSpan.toUpperCase()}</Text>
      </View>
      <Image source={EMBLEMS[g.level - 1]} style={s.emblem} contentFit="contain" transition={250} />
      <Text style={s.name}>
        {g.rankName}
        {g.division ? ` ${g.division}` : ""}
      </Text>
      <Text style={s.role}>{rank.role}</Text>
      {g.division ? (
        <>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.round(frac * 100)}%` }]} />
          </View>
          <View style={s.between}>
            <Text style={s.small}>{g.held ? "Division bar full" : `${g.within} / ${g.divisionSize} RP in this division`}</Text>
            <Text style={s.small}>{g.rawRP.toLocaleString()} RP</Text>
          </View>
        </>
      ) : (
        <Text style={s.small}>{g.rawRP.toLocaleString()} RP this season</Text>
      )}

      <View style={s.chips}>
        <View style={s.chip}>
          <Ionicons name="flame" size={14} color={g.week.streakReached ? colors.brandSecondary : colors.muted} />
          <Text style={s.chipText}>{g.week.streakWeeks > 0 ? `Streak ${g.week.streakWeeks} ${g.week.streakWeeks === 1 ? "week" : "weeks"}` : "No streak yet"}</Text>
        </View>
        <View style={s.chip}>
          <Text style={s.chipText}>{g.week.minutes} min this week</Text>
        </View>
      </View>

      <View style={s.weekBox}>
        <Text style={s.eyebrow}>THIS WEEK</Text>
        <WeekStrip week={week} trained={trained} plan={plan} />
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>{fresh ? "Set your week and start your first warm-up" : "Open Rank & Plan"}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.brandSecondary} />
      </View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.brandSecondary, gap: 6, marginBottom: spacing.lg },
  top: { flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: colors.brandSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  emblem: { width: "100%", height: 130, marginVertical: 2 },
  name: { color: colors.onSurface, fontSize: 26, fontWeight: "900" },
  role: { color: colors.muted, fontSize: 12 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, overflow: "hidden", marginTop: 4 },
  fill: { height: "100%", backgroundColor: colors.brandSecondary },
  between: { flexDirection: "row", justifyContent: "space-between" },
  small: { color: colors.muted, fontSize: 11 },
  chips: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  weekBox: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10, gap: 8 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 10 },
  footerText: { color: colors.brandSecondary, fontSize: 12, fontWeight: "800" },
});
