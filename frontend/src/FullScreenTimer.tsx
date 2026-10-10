import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, StatusBar, BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "./theme";
import { useSoundEnabled, useTickEnabled } from "./sound";

export type Pill = { label: string; state: "done" | "current" | "todo" };

export type FullScreenProps = {
  eyebrow: string; // e.g. "RAISE · STEP 3 / 24"
  title: string;
  big: string; // the large countdown, e.g. "00:35"
  badge?: string; // e.g. "REP 3 / 8" or "HOLD"
  pills?: Pill[];
  lines?: string[];
  purpose?: string;
  progress: number; // 0..1 of the whole session
  accent?: string;
  nextUp?: string | null; // when set, the "NEXT" card slides in
  running: boolean;
  showTickToggle?: boolean;
  onToggle: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
};

// Hide the Android navigation bar while a timer is full-screen (best effort).
function setImmersive(on: boolean) {
  try {
    const nb = require("expo-navigation-bar");
    nb.setVisibilityAsync(on ? "hidden" : "visible").catch(() => {});
  } catch {}
}

export function FullScreenTimer(p: FullScreenProps) {
  const insets = useSafeAreaInsets();
  const [soundOn, setSoundOn] = useSoundEnabled();
  const [tickOn, setTickOn] = useTickEnabled();
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useRef(new Animated.Value(1)).current;
  const accent = p.accent ?? colors.brandSecondary;

  const poke = () => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 3000);
  };

  useEffect(() => {
    setImmersive(true);
    poke();
    return () => {
      setImmersive(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // keep controls visible while paused
  useEffect(() => {
    if (!p.running) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setControls(true);
    } else poke();
  }, [p.running]);

  // Android back: first pauses, second leaves
  const runningRef = useRef(p.running);
  runningRef.current = p.running;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (runningRef.current) p.onToggle();
      else p.onClose();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Animated.timing(slide, { toValue: p.nextUp ? 0 : 1, duration: 350, useNativeDriver: true }).start();
  }, [!!p.nextUp]);

  return (
    <Pressable style={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]} onPress={poke}>
      <StatusBar hidden />
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.round(Math.min(1, Math.max(0, p.progress)) * 100)}%`, backgroundColor: accent }]} />
      </View>

      <View style={styles.top}>
        <Text style={[styles.eyebrow, { color: accent }]}>{p.eyebrow}</Text>
        <Text style={styles.title}>{p.title}</Text>
        {p.pills && p.pills.length > 1 ? (
          <View style={styles.pills}>
            {p.pills.map((x, i) => (
              <View key={i} style={[styles.pill, x.state === "current" && { backgroundColor: accent }, x.state === "done" && { opacity: 0.4 }]}>
                <Text style={[styles.pillText, x.state === "current" && { color: "#0a0a0c" }]}>{x.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.center}>
        <Text style={styles.big} adjustsFontSizeToFit numberOfLines={1}>{p.big}</Text>
        {p.badge ? <Text style={[styles.badge, { color: accent }]}>{p.badge}</Text> : null}
      </View>

      <View style={styles.info}>
        {p.purpose ? <Text style={styles.purpose}>{p.purpose}</Text> : null}
        {(p.lines ?? []).map((l, i) => (
          <Text key={i} style={styles.line}>• {l}</Text>
        ))}
      </View>

      {p.nextUp ? (
        <Animated.View
          style={[styles.next, { borderColor: accent, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 320] }) }] }]}
        >
          <Text style={[styles.nextLabel, { color: accent }]}>NEXT</Text>
          <Text style={styles.nextText} numberOfLines={2}>{p.nextUp}</Text>
        </Animated.View>
      ) : null}

      <View style={[styles.controls, { opacity: controls ? 1 : 0 }]} pointerEvents={controls ? "auto" : "none"}>
        <Pressable onPress={p.onClose} style={styles.iconBtn} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        {p.onPrev ? (
          <Pressable onPress={p.onPrev} style={styles.iconBtn} accessibilityLabel="Previous">
            <Ionicons name="play-skip-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Pressable onPress={p.onToggle} style={[styles.playBtn, { backgroundColor: accent }]} accessibilityLabel={p.running ? "Pause" : "Play"}>
          <Ionicons name={p.running ? "pause" : "play"} size={32} color="#0a0a0c" />
        </Pressable>
        {p.onNext ? (
          <Pressable onPress={p.onNext} style={styles.iconBtn} accessibilityLabel="Next">
            <Ionicons name="play-skip-forward" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => setSoundOn(!soundOn)} style={styles.iconBtn} accessibilityLabel="Sound">
          <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={22} color={colors.onSurface} />
        </Pressable>
        {p.showTickToggle ? (
          <Pressable onPress={() => setTickOn(!tickOn)} style={[styles.iconBtn, !tickOn && { opacity: 0.4 }]} accessibilityLabel="Rhythm tick">
            <Ionicons name="musical-notes" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: "#1a1a20" },
  barFill: { height: 4 },
  top: { alignItems: "center", gap: 8, marginTop: spacing.md },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.5, textAlign: "center" },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800", textAlign: "center" },
  pills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "#1f1f26" },
  pillText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  big: { color: colors.onSurface, fontSize: 96, fontWeight: "900", fontVariant: ["tabular-nums"], maxWidth: "100%" },
  badge: { fontSize: 22, fontWeight: "800", letterSpacing: 2, marginTop: 4 },
  info: { gap: 6, marginBottom: spacing.md, backgroundColor: "#101014", borderRadius: 16, padding: spacing.md },
  purpose: { color: colors.muted, fontSize: 14, fontStyle: "italic", marginBottom: 2 },
  line: { color: colors.onSurface, fontSize: 15, lineHeight: 21 },
  next: { position: "absolute", right: 0, top: "38%", width: 170, backgroundColor: "#16161c", borderLeftWidth: 4, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, padding: 12, gap: 4 },
  nextLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  nextText: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, paddingTop: spacing.sm },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#1a1a20", alignItems: "center", justifyContent: "center" },
  playBtn: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
});
