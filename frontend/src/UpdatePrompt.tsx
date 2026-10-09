import { useEffect, useState } from "react";
import { AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { checkForUpdate, installedBuild, shortNotes, snoozeUpdate, type UpdateInfo } from "./update";
import { colors, radius, spacing } from "./theme";

export async function openUpdate(info: UpdateInfo) {
  try {
    await Linking.openURL(info.apkUrl);
  } catch {
    try {
      await Linking.openURL(info.pageUrl);
    } catch {}
  }
}

// Pops up once when a newer APK is on GitHub. Does nothing in dev builds or when offline.
export function UpdatePrompt() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const r = await checkForUpdate();
      if (alive && r.status === "update") setInfo(r.info);
    };
    const t = setTimeout(run, 3000); // let the app finish loading first
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") run();
    });
    return () => {
      alive = false;
      clearTimeout(t);
      sub.remove();
    };
  }, []);

  if (!info) return null;
  const notes = shortNotes(info.notes);
  const close = () => {
    snoozeUpdate(info.build);
    setInfo(null);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="update-prompt">
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-download-outline" size={26} color={colors.brandSecondary} />
          </View>
          <Text style={styles.title}>New version available</Text>
          <Text style={styles.sub}>
            Build {info.build} is ready (you have build {installedBuild()}).
          </Text>
          {notes ? (
            <ScrollView style={styles.notesBox}>
              <Text style={styles.notes}>{notes}</Text>
            </ScrollView>
          ) : null}
          <Pressable
            testID="update-now"
            style={styles.primary}
            onPress={() => {
              openUpdate(info);
              setInfo(null);
            }}
          >
            <Text style={styles.primaryText}>Update</Text>
          </Pressable>
          <Pressable testID="update-later" onPress={close} style={styles.secondary}>
            <Text style={styles.secondaryText}>Later</Text>
          </Pressable>
          <Text style={styles.hint}>Tap the downloaded file to install. Android may ask you to allow it once.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: {
    width: "100%", maxWidth: 420, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, alignItems: "stretch",
  },
  iconWrap: { alignSelf: "center", marginBottom: 4 },
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "900", textAlign: "center" },
  sub: { color: colors.muted, fontSize: 13, textAlign: "center" },
  notesBox: { maxHeight: 140, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  notes: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19 },
  primary: { backgroundColor: colors.brandPrimary, borderRadius: radius.pill, paddingVertical: 13, alignItems: "center", marginTop: spacing.md },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  secondary: { paddingVertical: 10, alignItems: "center" },
  secondaryText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  hint: { color: colors.finePrint, fontSize: 11, textAlign: "center" },
});
