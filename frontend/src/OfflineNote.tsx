import { Pressable, StyleSheet, Text } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { formatDistanceToNowStrict } from "date-fns";
import { useStaleSince, retryNow } from "./offline";
import { colors, radius, spacing } from "./theme";

// A quiet one-line note when the screen is showing the copy saved on the phone. Tap to try again.
export function OfflineNote() {
  const at = useStaleSince();
  if (at === null) return null;
  return (
    <Pressable onPress={retryNow} style={s.note} accessibilityRole="button" accessibilityLabel="Showing saved copy. Tap to try again." testID="offline-note">
      <Ionicons name="cloud-offline-outline" size={14} color={colors.muted} />
      <Text style={s.text} numberOfLines={1}>
        Offline · saved copy from {formatDistanceToNowStrict(at)} ago
      </Text>
      <Text style={s.retry}>Retry</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  note: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 6, marginBottom: spacing.md,
  },
  text: { color: colors.muted, fontSize: 12, flex: 1 },
  retry: { color: colors.brandSecondary, fontSize: 12, fontWeight: "800" },
});
