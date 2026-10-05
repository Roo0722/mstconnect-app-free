import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, spacing, radius } from "../src/theme";
import { BackgroundGlow } from "../src/BackgroundGlow";

const FORMSPREE_URL = "https://formspree.io/f/xgavddoo";

export default function EnquiryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  const canSubmit = name.trim() && email.trim() && message.trim() && status !== "sending";

  const submit = async () => {
    if (!canSubmit) return;
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (e: any) {
      setStatus("err");
      setErrMsg(e?.message ?? "Something went wrong");
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Enquiry</Text>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>
            Have a question or want to join MSTC? Send us a message — we read every one.
          </Text>

          <Field label="Your name">
            <TextInput
              testID="enquiry-name"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Juan Dela Cruz"
              placeholderTextColor={colors.finePrint}
            />
          </Field>
          <Field label="Email">
            <TextInput
              testID="enquiry-email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.finePrint}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </Field>
          <Field label="Subject (optional)">
            <TextInput
              testID="enquiry-subject"
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Joining recruitment"
              placeholderTextColor={colors.finePrint}
            />
          </Field>
          <Field label="Message">
            <TextInput
              testID="enquiry-message"
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us a bit about yourself…"
              placeholderTextColor={colors.finePrint}
              multiline
              textAlignVertical="top"
            />
          </Field>

          {status === "ok" && (
            <View testID="enquiry-success" style={styles.alertOk}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.alertOkText}>Thank you! Your enquiry has been sent.</Text>
            </View>
          )}
          {status === "err" && (
            <View testID="enquiry-error" style={styles.alertErr}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.alertErrText}>Could not send ({errMsg}). Please try again.</Text>
            </View>
          )}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            testID="enquiry-submit"
            disabled={!canSubmit}
            onPress={submit}
            style={[styles.submit, !canSubmit && styles.submitDisabled]}
          >
            {status === "sending" ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.submitText}>Submit Enquiry</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
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
  lead: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { color: colors.finePrint, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    color: colors.onSurface, fontSize: 15,
  },
  textarea: { minHeight: 120 },
  alertOk: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderWidth: 1, borderColor: colors.success,
    padding: spacing.md, borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  alertOkText: { color: colors.success, fontSize: 13, fontWeight: "700", flex: 1 },
  alertErr: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.brandTertiary,
    borderWidth: 1, borderColor: colors.error,
    padding: spacing.md, borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  alertErrText: { color: colors.error, fontSize: 13, fontWeight: "700", flex: 1 },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  submit: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 14, alignItems: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800", letterSpacing: 0.4 },
});
