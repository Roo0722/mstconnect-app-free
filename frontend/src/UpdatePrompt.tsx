import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { checkForUpdate, installedBuild, shortNotes, snoozeUpdate, type UpdateInfo } from "./update";
import { colors, radius, spacing } from "./theme";
import { install, openInBrowser, restoreInstall, useInstall } from "./installUpdate";

// Pops up once when a newer APK is on GitHub. Does nothing in dev builds or when offline.
export function UpdatePrompt() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const { state, pct, start, reset, pending, pendingState } = useInstall(info);
  const [hidden, setHidden] = useState(false); // "keep going in the background" for this session

  // A download that is running, or a finished file waiting to be installed, brings the pop-up back on the next open
  useEffect(() => {
    if (!info && !hidden && pending && (pendingState === "ready" || pendingState === "downloading" || pendingState === "installing")) setInfo(pending);
  }, [info, hidden, pending, pendingState]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      await restoreInstall();
      const r = await checkForUpdate();
      if (alive && r.status === "update") setInfo((cur) => cur ?? r.info);
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
  const working = state === "downloading" || state === "installing";
  const ready = state === "ready";
  const close = () => {
    if (state === "installing") return;
    if (state === "downloading" || ready) {
      // the download keeps going (or the file stays ready); just hide the pop-up for now
      setHidden(true);
      setInfo(null);
      return;
    }
    snoozeUpdate(info.build);
    reset();
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
          {state === "error" ? (
            <Text style={styles.error}>Couldn't download inside the app. Check your connection and try again.</Text>
          ) : null}
          <Pressable testID="update-now" disabled={working} style={[styles.primary, working && { opacity: 0.8 }]} onPress={() => (ready ? install() : start(info))}>
            {working ? (
              <View style={styles.row}>
                <ActivityIndicator color={colors.onBrandPrimary} />
                <Text style={styles.primaryText}>
                  {state === "installing" ? "Opening installer…" : pct >= 0 ? `Downloading… ${pct}%` : "Downloading…"}
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>{ready ? "Install now" : state === "error" ? "Try again" : "Download & install"}</Text>
            )}
          </Pressable>
          {state === "error" ? (
            <Pressable onPress={() => openInBrowser(info)} style={styles.secondary}>
              <Text style={styles.secondaryText}>Open in browser instead</Text>
            </Pressable>
          ) : null}
          {state !== "installing" ? (
            <Pressable testID="update-later" onPress={close} style={styles.secondary}>
              <Text style={styles.secondaryText}>{state === "downloading" ? "Keep downloading in background" : ready ? "Install later" : "Later"}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.hint}>
            The download keeps going if you leave the app, and the file stays on your phone until it's installed. Android will ask you to confirm the install. The first time, it may ask you to allow installs from MSTConnect. Allow it, then tap Install again.
          </Text>
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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  error: { color: colors.error, fontSize: 12, textAlign: "center" },
  hint: { color: colors.finePrint, fontSize: 11, textAlign: "center" },
});
