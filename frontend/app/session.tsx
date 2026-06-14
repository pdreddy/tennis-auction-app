import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";
import { colors, spacing, radius, font } from "@/src/theme";

export default function Session() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user, logout } = useAuth();

  const [joinId, setJoinId] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (token) api.config(token).then(setConfig).catch(() => {});
  }, [token]);

  const createNew = async () => {
    if (!token) return;
    setError(null);
    setCreating(true);
    try {
      const res = await api.createAuction(token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/auction/${res.sessionId}`);
    } catch (e: any) {
      setError(e?.detail || "Could not create auction");
    } finally {
      setCreating(false);
    }
  };

  const joinExisting = async () => {
    if (!token) return;
    const id = joinId.trim().toUpperCase();
    if (!id) {
      setError("Enter a Session ID");
      return;
    }
    setError(null);
    setJoining(true);
    try {
      await api.getAuction(id, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/auction/${id}`);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.status === 404 ? `Session ${id} not found` : e?.detail || "Could not join");
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="session-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hi{user?.name ? `, ${user.name}` : ""}</Text>
          <Text style={styles.title}>TENNIS AUCTION</Text>
        </View>
        <Pressable testID="logout-button" onPress={logout} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={colors.onSurfaceSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.banner} testID="session-error">
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          )}

          {user?.role === "admin" ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Ionicons name="add-circle" size={20} color={colors.brand} />
                  <Text style={styles.cardTitle}>Start a new auction</Text>
                </View>
                <Text style={styles.cardSub}>
                  Creates a fresh session with all 14 teams and a 6-character ID to share.
                </Text>
                <Pressable
                  testID="create-auction-button"
                  style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
                  onPress={createNew}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color={colors.onBrand} />
                  ) : (
                    <Text style={styles.ctaText}>Create New Auction</Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.orRow}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
              </View>
            </>
          ) : (
            <View style={styles.teamBanner} testID="captain-banner">
              <Ionicons name="people" size={24} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.teamBannerTitle}>You are the captain of Team {user?.teamId}</Text>
                <Text style={styles.cardSub}>
                  Enter the Session ID from your Auctioneer to join and bid for your team.
                </Text>
              </View>
            </View>
          )}

          {/* Join */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="enter-outline" size={20} color={colors.info} />
              <Text style={styles.cardTitle}>Join existing</Text>
            </View>
            <TextInput
              testID="session-id-input"
              style={styles.codeInput}
              placeholder="ABC123"
              placeholderTextColor={colors.onSurfaceTertiary}
              value={joinId}
              onChangeText={(t) => setJoinId(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={joinExisting}
            />
            <Pressable
              testID="join-auction-button"
              style={({ pressed }) => [styles.ctaSecondary, pressed && { opacity: 0.85 }]}
              onPress={joinExisting}
              disabled={joining || !joinId.trim()}
            >
              {joining ? (
                <ActivityIndicator color={colors.onSurface} />
              ) : (
                <Text style={styles.ctaSecondaryText}>Join Auction</Text>
              )}
            </Pressable>
          </View>

          {/* Health check */}
          {config && (
            <View style={styles.health} testID="health-panel">
              <Text style={styles.healthTitle}>Setup check</Text>
              <HealthRow label="Teams" value={`${config.teams} / 14`} ok={config.teams === 14} />
              <HealthRow
                label="Auction-pool players"
                value={`${config.poolPlayers}`}
                ok={config.poolPlayers > 0}
              />
              <HealthRow
                label="Total people"
                value={`${config.totalPlayers}`}
                ok={config.totalPlayers >= config.teams * config.teamSize}
              />
              {config.pools.map((p: any) => (
                <View key={p.key} style={styles.poolRow}>
                  <Text style={styles.poolLabel}>UTR {p.utr}</Text>
                  <Text style={styles.poolVal}>
                    {p.count === 0 ? "auto-skipped" : `${p.count} players · max ${p.cap}/team`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.healthRow}>
      <Text style={styles.healthLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={styles.healthValue}>{value}</Text>
        <Ionicons
          name={ok ? "checkmark-circle" : "alert-circle"}
          size={15}
          color={ok ? colors.success : colors.warning}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  hello: { color: colors.onSurfaceSecondary, fontFamily: font.text, fontSize: 13 },
  title: { color: colors.onSurface, fontFamily: font.display, fontSize: 26, letterSpacing: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.error, fontFamily: font.text, fontSize: 13, flex: 1 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { color: colors.onSurface, fontFamily: font.displaySemi, fontSize: 20 },
  cardSub: { color: colors.onSurfaceSecondary, fontFamily: font.text, fontSize: 13, lineHeight: 19 },
  cta: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: colors.onBrand, fontFamily: font.displaySemi, fontSize: 18 },
  ctaSecondary: {
    backgroundColor: colors.surfaceTertiary,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ctaSecondaryText: { color: colors.onSurface, fontFamily: font.displaySemi, fontSize: 18 },
  codeInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.onSurface,
    fontFamily: font.display,
    fontSize: 30,
    letterSpacing: 8,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  orText: { color: colors.onSurfaceTertiary, fontFamily: font.displayMed, fontSize: 14 },
  health: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  healthTitle: { color: colors.onSurface, fontFamily: font.displaySemi, fontSize: 16, marginBottom: spacing.sm },
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  healthLabel: { color: colors.onSurfaceSecondary, fontFamily: font.text, fontSize: 13 },
  healthValue: { color: colors.onSurface, fontFamily: font.text, fontSize: 13 },
  poolRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  poolLabel: { color: colors.onSurfaceTertiary, fontFamily: font.text, fontSize: 12 },
  poolVal: { color: colors.onSurfaceTertiary, fontFamily: font.text, fontSize: 12 },
  teamBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  teamBannerTitle: { color: colors.onSurface, fontFamily: font.displaySemi, fontSize: 18 },
});
