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
  Modal,
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

const ACCOUNTS = [
  { code: "ADMIN", label: "Admin · Auctioneer" },
  ...Array.from({ length: 16 }, (_, i) => ({ code: `TEAM${i + 1}`, label: `Team ${i + 1}` })),
];

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [account, setAccount] = useState(ACCOUNTS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (pin.length < 6) {
      setError("Enter your 6-digit PIN");
      return;
    }
    setBusy(true);
    try {
      await login(account.code, pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/session");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.detail || "Invalid code or PIN");
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
            <Text style={styles.cardTitle}>Sign in</Text>

            <Text style={styles.fieldLabel}>Account</Text>
            <Pressable
              testID="account-selector"
              style={styles.selector}
              onPress={() => setPickerOpen(true)}
            >
              <Ionicons
                name={account.code === "ADMIN" ? "shield-checkmark" : "people"}
                size={18}
                color={colors.brand}
              />
              <Text style={styles.selectorText}>{account.label}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.onSurfaceTertiary} />
            </Pressable>

            <Text style={styles.fieldLabel}>6-digit PIN</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="keypad-outline" size={18} color={colors.onSurfaceTertiary} />
              <TextInput
                testID="pin-input"
                style={[styles.input, styles.pinInput]}
                placeholder="● ● ● ● ● ●"
                placeholderTextColor={colors.onSurfaceTertiary}
                value={pin}
                onChangeText={(t) => setPin(t.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
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
                <Text style={styles.ctaText}>Sign In</Text>
              )}
            </Pressable>

            <Text style={styles.hint}>
              Captains bid for their own team. The Auctioneer runs the draft.
            </Text>
          </View>

          <Modal
            visible={pickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setPickerOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
              <View style={styles.pickerCard} testID="account-picker">
                <Text style={styles.pickerTitle}>Choose account</Text>
                <ScrollView style={{ maxHeight: 380 }}>
                  {ACCOUNTS.map((a) => (
                    <Pressable
                      key={a.code}
                      testID={`account-option-${a.code}`}
                      style={[styles.pickerRow, account.code === a.code && styles.pickerRowActive]}
                      onPress={() => {
                        setAccount(a);
                        setPickerOpen(false);
                        setError(null);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text style={styles.pickerRowText}>{a.label}</Text>
                      {account.code === a.code && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
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
  fieldLabel: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.displayMed,
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: -spacing.xs,
  },
  selector: {
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
  selectorText: { flex: 1, color: colors.onSurface, fontFamily: font.displaySemi, fontSize: 17 },
  pinInput: { fontFamily: font.display, fontSize: 22, letterSpacing: 6 },
  hint: {
    color: colors.onSurfaceTertiary,
    fontFamily: font.text,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  pickerCard: {
    width: "100%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pickerTitle: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 20,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  pickerRowActive: { backgroundColor: colors.brandTertiary },
  pickerRowText: { color: colors.onSurface, fontFamily: font.text, fontSize: 16 },
});
