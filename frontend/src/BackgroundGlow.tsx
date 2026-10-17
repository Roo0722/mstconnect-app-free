import { memo } from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "./theme";

// A soft corner glow built from a few stacked, translucent circles. The old version used a 120 px blurred
// box-shadow on two huge circles, which is expensive to draw on phones and was repeated on every screen.
// Plain circles are cheap, and memo() stops them re-rendering when a screen's state changes.
const RINGS = [1, 0.8, 0.6, 0.4, 0.2]; // relative sizes, biggest first

function Glow({ color, size, opacity, style }: { color: string; size: number; opacity: number; style: object }) {
  return (
    <View style={[styles.glow, { width: size, height: size }, style]}>
      {RINGS.map((k) => (
        <View
          key={k}
          style={{ position: "absolute", width: size * k, height: size * k, borderRadius: size, backgroundColor: color, opacity: opacity / RINGS.length }}
        />
      ))}
    </View>
  );
}

export const BackgroundGlow = memo(function BackgroundGlow() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.nonInteractive]}>
      <Glow color={colors.brandPrimary} size={420} opacity={0.5} style={{ top: -170, right: -150 }} />
      <Glow color={colors.brandSecondary} size={420} opacity={0.22} style={{ bottom: -190, left: -170 }} />
    </View>
  );
});

const styles = StyleSheet.create({
  glow: { position: "absolute", alignItems: "center", justifyContent: "center" },
  nonInteractive: { pointerEvents: "none", overflow: "hidden" },
});
