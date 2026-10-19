import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname } from "expo-router";
import { Image } from "expo-image";
import { colors, radius, spacing } from "../theme";
import { RANKS } from "../game/config";
import { EMBLEMS } from "../game/emblems";
import { usePromotion } from "../game/promotion";
import { ShareCard, shareRankPicture } from "./ui";

// Full-screen moment when your level goes up. Never shown in the middle of a timer.
export function PromotionModal() {
  const { game: g, level, dismiss } = usePromotion();
  const path = usePathname();
  const busy = path.startsWith("/tools/");
  const show = level !== null && !busy;

  const cardRef = useRef<View>(null);
  const scale = useRef(new Animated.Value(0.85)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    scale.setValue(0.85);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [show]);

  if (!show || level === null) return null;
  const rank = RANKS[level - 1];
  const name = `${g.rankName}${g.division ? ` ${g.division}` : ""}`;

  return (
    <Modal visible animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={s.root} testID="promotion-screen">
        <View pointerEvents="none" style={{ position: "absolute", left: -2000, top: 0 }}>
          <ShareCard ref={cardRef} g={g} />
        </View>
        <View pointerEvents="none" style={s.glowOuter} />
        <View pointerEvents="none" style={s.glowInner} />

        <Text style={s.eyebrow}>PROMOTION</Text>
        <Text style={s.lead}>You moved up a rank.</Text>

        <Animated.View style={{ opacity: fade, transform: [{ scale }], width: "100%", alignItems: "center" }}>
          <Image source={EMBLEMS[level - 1]} style={s.emblem} contentFit="contain" priority="high" accessibilityLabel={`${rank.name} emblem`} />
          <Text style={s.level}>LEVEL {level} OF 8</Text>
          <Text style={s.name} accessibilityRole="header">{name}</Text>
          <Text style={s.role}>{rank.role}</Text>
        </Animated.View>

        <View style={s.chips}>
          <View style={s.chip}><Text style={s.chipText}>{g.rawRP.toLocaleString()} RP</Text></View>
          {g.week.streakWeeks > 0 ? (
            <View style={s.chip}><Text style={s.chipText}>Streak {g.week.streakWeeks} {g.week.streakWeeks === 1 ? "week" : "weeks"}</Text></View>
          ) : null}
        </View>

        <View style={s.actions}>
          <Pressable onPress={() => shareRankPicture(cardRef, g)} style={({ pressed }) => [s.primary, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <Text style={s.primaryText}>Share my new rank</Text>
          </Pressable>
          <Pressable onPress={dismiss} style={s.secondary} accessibilityRole="button" testID="promotion-continue">
            <Text style={s.secondaryText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0a05", alignItems: "center", paddingTop: 72, paddingBottom: 36, paddingHorizontal: spacing.lg },
  glowOuter: { position: "absolute", top: 120, width: 460, height: 460, borderRadius: 230, backgroundColor: "rgba(252, 209, 22, 0.05)" },
  glowInner: { position: "absolute", top: 190, width: 320, height: 320, borderRadius: 160, backgroundColor: "rgba(252, 209, 22, 0.07)" },
  eyebrow: { color: colors.brandSecondary, fontSize: 12, fontWeight: "900", letterSpacing: 3 },
  lead: { color: "#c8c8d0", fontSize: 15, marginTop: 8 },
  emblem: { width: 300, height: 290, marginTop: 24 },
  level: { color: "#9a9aa5", fontSize: 12, fontWeight: "800", letterSpacing: 1.6, marginTop: 8 },
  name: { color: "#f5f5f5", fontSize: 34, fontWeight: "900", textAlign: "center", marginTop: 6 },
  role: { color: "#b8b8c2", fontSize: 14, textAlign: "center", marginTop: 8 },
  chips: { flexDirection: "row", gap: 8, marginTop: 22, flexWrap: "wrap", justifyContent: "center" },
  chip: { backgroundColor: "#1f1f26", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: "#f5f5f5", fontSize: 12, fontWeight: "700" },
  actions: { marginTop: "auto", width: "100%", gap: 10 },
  primary: { backgroundColor: colors.brandPrimary, borderRadius: radius.pill, minHeight: 50, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
  secondary: { borderWidth: 1, borderColor: "#3a3a44", borderRadius: radius.pill, minHeight: 46, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#c8c8d0", fontSize: 14, fontWeight: "700" },
});
