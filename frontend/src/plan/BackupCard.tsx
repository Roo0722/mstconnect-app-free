import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { applyBackup, exportBackup, pickBackup } from "../backup";
import { colors, radius, spacing } from "../theme";

const day = (ms: number | null) => (ms ? new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10) : "");

// Rank & Plan: move your progress to another phone, or between the Beta and the normal app.
export function BackupCard() {
  const [busy, setBusy] = useState<"save" | "restore" | null>(null);

  const save = async () => {
    setBusy("save");
    try {
      const r = await exportBackup();
      if (r === "unavailable") Alert.alert("Can't share here", "This phone can't open the share sheet.");
    } catch {
      Alert.alert("Couldn't make the backup", "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      const r = await pickBackup();
      if (!r) return;
      if (!r.ok) {
        Alert.alert("Can't restore", r.reason);
        return;
      }
      const s = r.summary;
      const what = s.sessions ? `${s.sessions} sessions (${s.minutes} min), ${day(s.first)} to ${day(s.last)}` : "no training sessions";
      Alert.alert(
        "Restore this backup?",
        `It has ${what}${s.hasPlan ? " and a weekly plan" : ""}.\n\nSessions are added to this phone, and nothing here is deleted. Your plan and presets are replaced by the backup's.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            onPress: async () => {
              setBusy("restore");
              try {
                const res = await applyBackup(r);
                Alert.alert("Restored", `${res.added} new sessions added. You now have ${res.total} in your log.`);
              } catch {
                Alert.alert("Couldn't restore", "Please try again.");
              } finally {
                setBusy(null);
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert("Couldn't open that file", "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.label}>BACKUP & TRANSFER</Text>
      <Text style={s.small}>
        Keep your training log, rank and weekly plan safe, or move them to a new phone. The backup is a small file you send to yourself, for example by Messenger or email. It stays private.
      </Text>
      <View style={s.row}>
        <Pressable onPress={save} disabled={busy !== null} style={[s.btn, s.primary]} accessibilityRole="button" testID="backup-save">
          {busy === "save" ? <ActivityIndicator color={colors.onBrandSecondary} /> : <Ionicons name="share-outline" size={16} color={colors.onBrandSecondary} />}
          <Text style={s.primaryText}>Back up my data</Text>
        </Pressable>
        <Pressable onPress={restore} disabled={busy !== null} style={[s.btn, s.ghost]} accessibilityRole="button" testID="backup-restore">
          {busy === "restore" ? <ActivityIndicator color={colors.onSurface} /> : <Ionicons name="download-outline" size={16} color={colors.onSurface} />}
          <Text style={s.ghostText}>Restore</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  label: { color: colors.brandSecondary, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  btn: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: radius.pill, paddingHorizontal: 10 },
  primary: { backgroundColor: colors.brandSecondary },
  primaryText: { color: colors.onBrandSecondary, fontSize: 13, fontWeight: "800" },
  ghost: { borderWidth: 1, borderColor: colors.border },
  ghostText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
});
