import { useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import Ionicons from "@react-native-vector-icons/ionicons";
import { SITE_URL } from "../src/api";
import { colors, spacing, radius } from "../src/theme";

// Shows the MSTC website inside the app (no external browser needed).
export default function WebsiteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { u } = useLocalSearchParams<{ u?: string }>();
  const [loading, setLoading] = useState(true);
  const web = useRef<WebView>(null);
  const uri = u ? String(u) : `${SITE_URL}/`;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={[styles.title, { flex: 1 }]}>MSTC Website</Text>
        <Pressable
          testID="reload-btn"
          onPress={() => {
            setLoading(true);
            web.current?.reload();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="refresh" size={20} color={colors.onSurface} />
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <WebView
          ref={web}
          source={{ uri }}
          style={{ flex: 1, backgroundColor: colors.surface }}
          onLoadEnd={() => setLoading(false)}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
        />
        {loading ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
