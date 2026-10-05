import { View, StyleSheet } from "react-native";
import { colors } from "./theme";

export function BackgroundGlow() {
  return (
    <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>
      <View style={styles.redGlow} />
      <View style={styles.yellowGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  redGlow: {
    position: "absolute",
    top: -140,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: colors.brandPrimary,
    opacity: 0.18,
    boxShadow: `0px 0px 120px ${colors.brandPrimary}`,
  },
  yellowGlow: {
    position: "absolute",
    bottom: -160,
    left: -140,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: colors.brandSecondary,
    opacity: 0.08,
    boxShadow: `0px 0px 120px ${colors.brandSecondary}`,
  },
  nonInteractive: { pointerEvents: "none", overflow: "hidden" },
});
