import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing, StatusBar, BackHandler, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "./theme";
import { useSoundEnabled, useTickEnabled } from "./sound";

export type Pill = { label: string; state: "done" | "current" | "todo" };

export type FullScreenProps = {
  eyebrow: string; // e.g. "RAISE · STEP 3 / 24"
  title: string;
  big: string; // the large countdown, e.g. "00:35"
  cueWord?: string; // what to do right now, e.g. "RIGHT · FORWARD" (shown above the countdown)
  badge?: string; // e.g. "REP 3 / 8" or "HOLD"
  then?: string; // small line under the badge, e.g. "Then: Left side"
  pills?: Pill[];
  lines?: string[];
  purpose?: string;
  progress: number; // 0..1 of the whole session
  accent?: string;
  tint?: string; // background colour for this moment (green right, red left, amber rest...); default is the normal dark
  urgent?: boolean; // last 3 seconds: the countdown gives a small pulse in time with the beeps
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

// One layer fades in over the previous colour. Native-driven, so it costs next to nothing.
function FadeIn({ color, instant }: { color: string; instant: boolean }) {
  const op = useRef(new Animated.Value(instant ? 1 : 0)).current;
  useEffect(() => {
    if (!instant) Animated.timing(op, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: op }]} />;
}

function Crossfade({ color }: { color: string }) {
  const st = useRef({ base: color, top: color, n: 0 });
  if (st.current.top !== color) st.current = { base: st.current.top, top: color, n: st.current.n + 1 };
  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: st.current.base }]} />
      <FadeIn key={st.current.n} color={st.current.top} instant={st.current.n === 0} />
    </>
  );
}

export function FullScreenTimer(p: FullScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [soundOn, setSoundOn] = useSoundEnabled();
  const [tickOn, setTickOn] = useTickEnabled();
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const prog = useRef(new Animated.Value(p.progress)).current;
  const lastProg = useRef(p.progress);
  const accent = p.accent ?? colors.brandSecondary;
  const bigSize = Math.min(150, Math.max(88, Math.round(height * 0.17)));

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

  // controls fade in and out instead of popping
  useEffect(() => {
    Animated.timing(fade, { toValue: controls ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [controls]);

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

  // progress glides between updates (one per second) instead of jumping
  useEffect(() => {
    const delta = Math.abs(p.progress - lastProg.current);
    lastProg.current = p.progress;
    const glide = p.running && delta < 0.05;
    Animated.timing(prog, { toValue: p.progress, duration: glide ? 1000 : 180, easing: Easing.linear, useNativeDriver: true }).start();
  }, [p.progress]);

  // the last three seconds: one gentle pulse per number, matching the beeps
  useEffect(() => {
    if (!p.urgent || !p.running) return;
    pulse.setValue(1);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.07, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [p.big, p.urgent]);

  return (
    <Pressable style={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]} onPress={poke}>
      <Crossfade color={p.tint ?? colors.surface} />
      <StatusBar hidden />
      <View style={styles.bar}>
        <Animated.View style={[styles.barFill, { backgroundColor: accent, transform: [{ scaleX: prog.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }) }] }]} />
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
        {p.cueWord ? <Text style={[styles.cue, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>{p.cueWord}</Text> : null}
        <Animated.View style={{ transform: [{ scale: pulse }], maxWidth: "100%" }}>
          <Text style={[styles.big, { fontSize: bigSize }]} adjustsFontSizeToFit numberOfLines={1}>{p.big}</Text>
        </Animated.View>
        {p.badge ? <Text style={[styles.badge, { color: accent }]}>{p.badge}</Text> : null}
        {p.then ? <Text style={styles.then}>{p.then}</Text> : null}
        {!p.running ? <Text style={styles.paused}>PAUSED</Text> : null}
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

      <Animated.View style={[styles.controls, { opacity: fade }]} pointerEvents={controls ? "auto" : "none"}>
        <Pressable onPress={p.onClose} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        {p.onPrev ? (
          <Pressable onPress={p.onPrev} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Previous exercise">
            <Ionicons name="play-skip-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Pressable onPress={p.onToggle} style={[styles.playBtn, { backgroundColor: accent }]} accessibilityRole="button" accessibilityLabel={p.running ? "Pause" : "Play"}>
          <Ionicons name={p.running ? "pause" : "play"} size={32} color="#0a0a0c" />
        </Pressable>
        {p.onNext ? (
          <Pressable onPress={p.onNext} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Next exercise">
            <Ionicons name="play-skip-forward" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => setSoundOn(!soundOn)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={soundOn ? "Mute sound" : "Turn sound on"}>
          <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={22} color={colors.onSurface} />
        </Pressable>
        {p.showTickToggle ? (
          <Pressable onPress={() => setTickOn(!tickOn)} style={[styles.iconBtn, !tickOn && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="Rhythm tick">
            <Ionicons name="musical-notes" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: "rgba(255,255,255,0.10)" },
  barFill: { height: 4, width: "100%", transformOrigin: "left center" },
  top: { alignItems: "center", gap: 8, marginTop: spacing.md },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.5, textAlign: "center" },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800", textAlign: "center" },
  pills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.12)" },
  pillText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cue: { fontSize: 30, fontWeight: "900", letterSpacing: 2, textAlign: "center", marginBottom: 2, maxWidth: "100%" },
  big: { color: colors.onSurface, fontWeight: "900", fontVariant: ["tabular-nums"] },
  badge: { fontSize: 20, fontWeight: "800", letterSpacing: 2, marginTop: 4 },
  then: { color: colors.muted, fontSize: 14, fontWeight: "600", marginTop: 6 },
  paused: { color: colors.onSurface, opacity: 0.7, fontSize: 12, fontWeight: "900", letterSpacing: 3, marginTop: 10 },
  info: { gap: 6, marginBottom: spacing.md, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 16, padding: spacing.md },
  purpose: { color: colors.muted, fontSize: 14, fontStyle: "italic", marginBottom: 2 },
  line: { color: colors.onSurface, fontSize: 15, lineHeight: 21 },
  next: { position: "absolute", right: 0, top: "38%", width: 170, backgroundColor: "#16161c", borderLeftWidth: 4, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, padding: 12, gap: 4 },
  nextLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  nextText: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, paddingTop: spacing.sm },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  playBtn: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
});
