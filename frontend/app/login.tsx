import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/context/AuthContext";
import { colors, spacing, radius, font } from "@/src/theme";

const BG =
  "https://images.unsplash.com/photo-1578966663421-00f3bfebfa89?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwzfHxkYXJrJTIwdGVubmlzJTIwY291cnQlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc4MTE0ODAxNnww&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/session");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="login-screen">
      <Image source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={["rgba(10,11,14,0.35)", "rgba(10,11,14,0.85)", colors.surface]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing["2xl"] }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandWrap}>
            <View style={styles.logoBadge}>
              <Ionicons name="tennisball" size={28} color={colors.brand} />
            </View>
            <Text style={styles.brandTitle}>TENNIS AUCTION</Text>
            <Text style={styles.brandSub}>Live player draft, in real time</Text>
          </View>

          <View style={[styles.card, { marginBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.cardTitle}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </Text>

            {mode === "register" && (
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.onSurfaceTertiary} />
                <TextInput
                  testID="name-input"
                  style={styles.input}
                  placeholder="Display name"
                  placeholderTextColor={colors.onSurfaceTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.onSurfaceTertiary} />
              <TextInput
                testID="email-input"
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.onSurfaceTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.onSurfaceTertiary} />
              <TextInput
                testID="password-input"
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.onSurfaceTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
              />
              <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} testID="toggle-password">
                <Ionicons
                  name={show ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.onSurfaceTertiary}
                />
              </Pressable>
            </View>

            {error && (
              <Text style={styles.error} testID="login-error">
                {error}
              </Text>
            )}

            <Pressable
              testID="submit-button"
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.ctaText}>
                  {mode === "login" ? "Sign In" : "Sign Up"}
                </Text>
              )}
            </Pressable>

            <Pressable
              testID="toggle-mode"
              onPress={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError(null);
              }}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {mode === "login" ? "New here? " : "Have an account? "}
                <Text style={styles.switchLink}>
                  {mode === "login" ? "Create one" : "Sign in"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: spacing.lg },
  brandWrap: { alignItems: "center", marginTop: spacing["3xl"] },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  brandTitle: {
    fontFamily: font.display,
    fontSize: 38,
    letterSpacing: 1,
    color: colors.onSurface,
  },
  brandSub: {
    fontFamily: font.text,
    fontSize: 14,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    fontFamily: font.displaySemi,
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  input: { flex: 1, color: colors.onSurface, fontFamily: font.text, fontSize: 16 },
  error: { color: colors.error, fontFamily: font.text, fontSize: 13 },
  cta: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  ctaText: { color: colors.onBrand, fontFamily: font.displaySemi, fontSize: 18, letterSpacing: 0.5 },
  switchRow: { alignItems: "center", paddingVertical: spacing.xs },
  switchText: { color: colors.onSurfaceSecondary, fontFamily: font.text, fontSize: 14 },
  switchLink: { color: colors.brand, fontFamily: font.text },
});
