import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../src/theme";
import { BackgroundGlow } from "../src/BackgroundGlow";
import { checkForUpdate, installedBuild, installedVersion, type UpdateInfo } from "../src/update";
import { openUpdate } from "../src/UpdatePrompt";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const build = installedBuild();
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState("");
  const [found, setFound] = useState<UpdateInfo | null>(null);

  const check = async () => {
    setChecking(true);
    setMsg("");
    setFound(null);
    const r = await checkForUpdate({ force: true });
    setChecking(false);
    if (r.status === "update") setFound(r.info);
    else if (r.status === "current") setMsg("You have the latest version.");
    else if (r.status === "error") setMsg("Couldn't check. Check your internet connection and try again.");
    else setMsg("Update checks only work in the installed app.");
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>About</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={styles.brandLarge}>MSTConnect</Text>
        <Text style={styles.tagline}>Malitbog Sepak Takraw Community · Companion</Text>

        <Text style={styles.version}>
          Version {installedVersion() || "—"}
          {build ? ` · build ${build}` : ""}
        </Text>

        <View style={styles.freePill}>
          <Ionicons name="sparkles" size={12} color={colors.onBrandSecondary} />
          <Text style={styles.freePillText}>ALWAYS FREE</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.body}>
            MSTConnect is the mobile companion for MSTC — a free, community-driven Sepak Takraw
            initiative in Malitbog, Southern Leyte. It gives you quick access to the next session
            countdown, announcements, enquiry, and courtside tools like a training timer, warm-up
            guide, score counter, and rules reference.
          </Text>
        </View>

        <Text style={styles.section}>APP UPDATES</Text>
        <View style={styles.list}>
          <Pressable testID="check-update" onPress={check} disabled={checking} style={styles.updateBtn}>
            {checking ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.updateBtnText}>Check for updates</Text>
              </>
            )}
          </Pressable>
          {msg ? <Text style={styles.bulletText}>{msg}</Text> : null}
          {found ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.bulletText}>Build {found.build} is available.</Text>
              <Pressable onPress={() => openUpdate(found)} style={styles.updateBtn}>
                <Ionicons name="cloud-download-outline" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.updateBtnText}>Download and install</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={styles.section}>WHO CAN JOIN MSTC</Text>
        <View style={styles.list}>
          <Bullet text="Complete beginners — no experience needed" />
          <Bullet text="School athletes and teenagers" />
          <Bullet text="Former players coming back" />
          <Bullet text="Veterans passing on their skill" />
          <Bullet text="Parents, teachers, and supporters" />
        </View>

        <Text style={styles.section}>COMMUNITY PRINCIPLES</Text>
        <View style={styles.list}>
          <Bullet text="No joining fee. No practice fee." />
          <Bullet text="Shared community balls and nets where available" />
          <Bullet text="Peer-supported: experienced players help beginners" />
        </View>

        <View style={styles.block}>
          <Text style={styles.body}>
            This app is a lightweight companion — it does not replace the main MSTC website or
            Messenger community. For full articles, gallery, and the AI assistant, open the MSTC
            site from the home screen.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  brandLarge: { color: colors.onSurface, fontSize: 36, fontWeight: "900", letterSpacing: 0.5 },
  tagline: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: spacing.md },
  version: { color: colors.finePrint, fontSize: 12, marginBottom: spacing.md },
  updateBtn: {
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.brandPrimary, borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: spacing.lg,
  },
  updateBtnText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  freePill: {
    alignSelf: "flex-start",
    flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
    marginBottom: spacing.lg,
  },
  freePillText: { color: colors.onBrandSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  block: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  body: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
  section: { color: colors.finePrint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: spacing.sm },
  list: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: 8,
  },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brandSecondary, marginTop: 8 },
  bulletText: { color: colors.onSurface, fontSize: 14, flex: 1, lineHeight: 20 },
});
