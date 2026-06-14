import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // useCallback kept for fetchState stub
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/context/AuthContext";
import { api, subscribeAuction } from "@/src/api";
import {
  colors,
  spacing,
  radius,
  font,
  POOL_ORDER,
  getUTRFromKey,
  TEAM_SIZE,
} from "@/src/theme";
import { POOL_CAPS } from "@/src/firebase/seed";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_GAP = 10;
const CARD_W = (SCREEN_W - spacing.lg * 2 - GRID_GAP) / 2;

const fmt = (n: number) => (n ?? 0).toLocaleString();

type State = any;

export default function AuctionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sid = String(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [state, setState] = useState<State | null>(null);
  const [connected, setConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [bidInputs, setBidInputs] = useState<Record<number, string>>({});
  const [bidErrors, setBidErrors] = useState<Record<number, string | null>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const offsetRef = useRef(0);
  const sheetRef = useRef<BottomSheet>(null);

  // Real-time Firebase listener — replaces 1.5s polling.
  useEffect(() => {
    const unsub = subscribeAuction(
      sid,
      (state) => {
        setState(state);
        setConnected(true);
      },
      () => setConnected(false),
    );
    return unsub;
  }, [sid]);

  const fetchState = useCallback(() => {}, []);

  // Timer tick.
  useEffect(() => {
    const iv = setInterval(() => {
      if (state?.timerEnd) {
        const rem = Math.max(
          0,
          Math.floor(
            (state.timerEnd - (Date.now() + offsetRef.current)) / 1000,
          ),
        );
        setTimeRemaining(rem);
      }
    }, 200);
    return () => clearInterval(iv);
  }, [state?.timerEnd]);

  const eff = useMemo(() => {
    if (!state) return null;
    const pools = state.playerPools || {};
    let effPool = state.currentPoolIndex;
    while (
      effPool < POOL_ORDER.length &&
      (pools[POOL_ORDER[effPool]] || []).length === 0
    )
      effPool++;
    if (effPool >= POOL_ORDER.length) return { complete: true } as any;
    const pool = pools[POOL_ORDER[effPool]] || [];
    const effPlayer =
      effPool === state.currentPoolIndex
        ? Math.min(state.currentPlayerIndex, Math.max(0, pool.length - 1))
        : 0;
    return {
      complete: false,
      effPool,
      effPlayer,
      poolKey: POOL_ORDER[effPool],
      pool,
      player: pool[effPlayer],
    } as any;
  }, [state]);

  const { winners, highestBid } = useMemo(() => {
    if (!state) return { winners: [] as number[], highestBid: 0 };
    const entries = Object.entries(state.currentBids || {})
      .map(([tid, b]) => ({ teamId: +tid, bid: b as number }))
      .filter((x) => x.bid > 0);
    if (!entries.length) return { winners: [], highestBid: 0 };
    const hb = Math.max(...entries.map((e) => e.bid));
    return {
      winners: entries.filter((e) => e.bid === hb).map((e) => e.teamId),
      highestBid: hb,
    };
  }, [state]);

  const capsByKey = state?.poolCaps || POOL_CAPS;
  const countFromPool = (team: any, utr: number) =>
    team.players.slice(1).filter((p: any) => p.utr === utr).length;
  const poolCapReached = (team: any, key: string) =>
    countFromPool(team, getUTRFromKey(key)) >= (capsByKey[key] || 0);

  const setErr = (teamId: number, msg: string | null) =>
    setBidErrors((p) => ({ ...p, [teamId]: msg }));

  const placeBid = async (teamId: number) => {
    if (!token || !eff?.player) return;
    const amount = parseInt(bidInputs[teamId] || "0", 10);
    setErr(teamId, null);
    try {
      await api.bid(sid, teamId, amount, token);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setBidInputs((p) => ({ ...p, [teamId]: "" }));
      fetchState();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (e?.status === 409) {
        fetchState();
        setErr(teamId, "Bid just changed — try again");
      } else {
        setErr(teamId, e?.detail || "Bid failed");
      }
    }
  };

  const doAction = async (fn: () => Promise<any>, ok: boolean) => {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      if (ok)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBidInputs({});
      setBidErrors({});
      fetchState();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setActionError(e?.detail || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <View style={styles.boot} testID="auction-loading">
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.bootText}>Loading auction {sid}…</Text>
      </View>
    );
  }

  const teams = state.teams || [];
  const isAdmin = user?.role === "admin";
  const myTeamId = user?.teamId ?? null;

  // ---------- Auction complete summary ----------
  if (eff?.complete || !eff?.player) {
    return (
      <View
        style={[styles.root, { paddingTop: insets.top }]}
        testID="auction-complete"
      >
        <Header
          sid={sid}
          connected={connected}
          onBack={() => router.replace("/session")}
          onReset={() => setResetOpen(true)}
          canReset={isAdmin}
        />
        <View style={styles.completeBanner}>
          <Ionicons name="trophy" size={20} color={colors.surface} />
          <Text style={styles.completeText}>Auction Complete</Text>
        </View>
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
        >
          {teams.map((t: any) => (
            <RosterCard key={t.id} team={t} />
          ))}
        </ScrollView>
        <ResetModal
          visible={resetOpen}
          busy={busy}
          onCancel={() => setResetOpen(false)}
          onConfirm={async () => {
            await doAction(() => api.reset(sid, token!), true);
            setResetOpen(false);
          }}
        />
      </View>
    );
  }

  const player = eff.player;
  const poolKey = eff.poolKey;
  const currentUTR = getUTRFromKey(poolKey);
  const pool = eff.pool;
  const progressPct = Math.min(
    100,
    Math.round(
      ((eff.effPool + eff.effPlayer / Math.max(1, pool.length)) /
        POOL_ORDER.length) *
        100,
    ),
  );
  const hasBids = winners.length > 0;
  const warn = timeRemaining <= 10;

  // Per-team status used by both captain and admin views.
  const teamStatus = (team: any) => {
    const teamBid = state.currentBids?.[String(team.id)] || 0;
    const isWinning =
      teamBid > 0 && teamBid === highestBid && winners.length === 1;
    const isTied = teamBid > 0 && teamBid === highestBid && winners.length > 1;
    const disabledReason =
      team.players.length >= TEAM_SIZE
        ? "Roster full"
        : team.budget < player.price
          ? "Budget too low"
          : poolCapReached(team, poolKey)
            ? `Max ${capsByKey[poolKey]} at UTR ${currentUTR}`
            : null;
    return { teamBid, isWinning, isTied, disabledReason };
  };

  // Captain's own interactive bid card.
  const renderBidCard = (team: any, label = "") => {
    const { teamBid, isWinning, isTied, disabledReason } = teamStatus(team);
    const err = bidErrors[team.id];
    const anchor = highestBid > 0 ? highestBid + 1000 : player.price;
    const chips = [anchor, anchor + 1000, anchor + 2000].filter(
      (v) => v <= team.budget,
    );

    if (disabledReason) {
      return (
        <View
          key={team.id}
          style={[styles.bidCard, styles.bidCardPinned]}
          testID="my-team-card"
        >
          <Text style={styles.teamName}>
            {team.name}
            {label}
          </Text>
          <Text style={styles.teamMeta}>
            ${fmt(team.budget)} · {team.players.length}/{TEAM_SIZE}
          </Text>
          <Text style={styles.cardError}>
            {disabledReason} — you cannot bid on this player.
          </Text>
        </View>
      );
    }

    return (
      <View
        key={team.id}
        testID="my-team-card"
        style={[
          styles.bidCard,
          styles.bidCardPinned,
          isWinning && styles.bidCardWinning,
          isTied && styles.bidCardTied,
        ]}
      >
        <View style={styles.bidHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName} numberOfLines={1}>
              {team.name}
              {label}
            </Text>
            <Text style={styles.teamMeta} numberOfLines={1}>
              ${fmt(team.budget)} · {team.players.length}/{TEAM_SIZE} ·{" "}
              {team.captain}
            </Text>
          </View>
        </View>

        <TextInput
          testID={`bid-input-${team.id}`}
          style={styles.bidInput}
          placeholder={`Min $${fmt(player.price)}`}
          placeholderTextColor={colors.onSurfaceTertiary}
          keyboardType="number-pad"
          value={bidInputs[team.id] || ""}
          onChangeText={(t) => {
            setBidInputs((p) => ({ ...p, [team.id]: t }));
            setErr(team.id, null);
          }}
          editable={timeRemaining > 0}
        />

        <View style={styles.chipsRow}>
          {chips.map((v) => (
            <Pressable
              key={v}
              testID={`chip-${team.id}-${v}`}
              style={styles.chip}
              disabled={timeRemaining === 0}
              onPress={() => {
                setBidInputs((p) => ({ ...p, [team.id]: String(v) }));
                setErr(team.id, null);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.chipText}>${v / 1000}k</Text>
            </Pressable>
          ))}
        </View>

        {err && <Text style={styles.cardError}>{err}</Text>}

        <Pressable
          testID={`place-bid-${team.id}`}
          style={[
            styles.bidBtn,
            (!bidInputs[team.id] || timeRemaining === 0) &&
              styles.bidBtnDisabled,
          ]}
          disabled={!bidInputs[team.id] || timeRemaining === 0}
          onPress={() => placeBid(team.id)}
        >
          <Text style={styles.bidBtnText}>Place Bid</Text>
        </Pressable>

        {teamBid > 0 && (
          <Text style={styles.yourBid}>
            Your bid ${fmt(teamBid)}
            {isWinning && "  · WINNING"}
            {isTied && "  · TIED"}
          </Text>
        )}
      </View>
    );
  };

  // Read-only status card for the other teams (and the admin grid).
  const renderReadOnly = (team: any) => {
    const { teamBid, isWinning, isTied } = teamStatus(team);
    return (
      <View
        key={team.id}
        testID={`team-status-${team.id}`}
        style={[
          styles.statusCard,
          isWinning && styles.bidCardWinning,
          isTied && styles.bidCardTied,
        ]}
      >
        <Text style={styles.statusName} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={styles.statusMeta} numberOfLines={1}>
          ${fmt(team.budget)} · {team.players.length}/{TEAM_SIZE}
        </Text>
        {teamBid > 0 ? (
          <Text
            style={[
              styles.statusBid,
              isWinning && { color: colors.success },
              isTied && { color: colors.warning },
            ]}
          >
            ${fmt(teamBid)}
            {isWinning ? " · LEAD" : isTied ? " · TIE" : ""}
          </Text>
        ) : (
          <Text style={styles.statusNoBid}>No bid</Text>
        )}
      </View>
    );
  };

  const myTeam =
    myTeamId != null ? teams.find((t: any) => t.id === myTeamId) : null;
  const otherTeams = teams.filter((t: any) => t.id !== myTeamId);

  return (
    <View
      style={[styles.root, { paddingTop: insets.top }]}
      testID="auction-screen"
    >
      <Header
        sid={sid}
        connected={connected}
        onBack={() => router.replace("/session")}
        onReset={() => setResetOpen(true)}
        canReset={isAdmin}
      />

      {/* Sticky context bar */}
      <View style={[styles.context, warn && styles.contextWarn]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.ctxPlayer} numberOfLines={1}>
            {player.Name}
            {player.isRetry ? `  ·R${player.retryCount}` : ""}
          </Text>
          <Text style={styles.ctxMeta} numberOfLines={1}>
            UTR {player.utr} · base ${fmt(player.price)} · {eff.effPlayer + 1}/
            {pool.length} in pool
          </Text>
          {highestBid > 0 && (
            <Text style={styles.ctxHigh} numberOfLines={1}>
              High ${fmt(highestBid)}
              {winners.length === 1
                ? ` · ${teams.find((t: any) => t.id === winners[0])?.name}`
                : winners.length > 1
                  ? " · TIE"
                  : ""}
            </Text>
          )}
        </View>
        <View style={[styles.timerBox, warn && styles.timerBoxWarn]}>
          <Text style={styles.timerNum}>{timeRemaining}</Text>
          <Text style={styles.timerLabel}>SEC</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Pool UTR {currentUTR} · {progressPct}% complete · {teams.length} teams
      </Text>

      {actionError && (
        <View style={styles.actionErr}>
          <Ionicons name="warning-outline" size={15} color={colors.error} />
          <Text style={styles.actionErrText}>{actionError}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 140,
          gap: GRID_GAP,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isAdmin ? (
          <>
            <Text style={styles.sectionLabel}>
              Enter bids · {teams.length} teams
            </Text>
            {teams.map((team: any) => renderBidCard(team))}
          </>
        ) : (
          <>
            {myTeam && renderBidCard(myTeam, " · You")}
            <Text style={styles.sectionLabel}>Other teams</Text>
            <View style={styles.grid}>{otherTeams.map(renderReadOnly)}</View>
          </>
        )}
      </ScrollView>

      {/* Admin controls + rosters */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <Pressable
          testID="open-rosters"
          style={isAdmin ? styles.rostersBtn : styles.rostersBtnWide}
          onPress={() => sheetRef.current?.snapToIndex(0)}
        >
          <Ionicons name="list" size={20} color={colors.onSurface} />
          {!isAdmin && (
            <Text style={styles.rostersBtnText}>View all team rosters</Text>
          )}
        </Pressable>
        {isAdmin && (
          <Pressable
            testID="skip-button"
            style={styles.skipBtn}
            onPress={() => doAction(() => api.skip(sid, token!), false)}
            disabled={busy}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
        {isAdmin && (
          <Pressable
            testID="finalize-button"
            style={[
              styles.finalizeBtn,
              (!hasBids || winners.length !== 1) && styles.finalizeDisabled,
            ]}
            disabled={!hasBids || winners.length !== 1 || busy}
            onPress={() => doAction(() => api.finalize(sid, token!), true)}
          >
            <Text style={styles.finalizeText}>
              {!hasBids
                ? "No Bids"
                : winners.length > 1
                  ? `Tie (${winners.length})`
                  : `Award · ${teams.find((t: any) => t.id === winners[0])?.name}`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Rosters bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["80%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surfaceSecondary }}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.md,
            paddingBottom: spacing.xl,
          }}
        >
          <Text style={styles.sheetTitle}>
            Team Rosters · {teams.length} teams
          </Text>
          {teams.map((t: any) => (
            <RosterCard key={t.id} team={t} />
          ))}
        </BottomSheetScrollView>
      </BottomSheet>

      <ResetModal
        visible={resetOpen}
        busy={busy}
        onCancel={() => setResetOpen(false)}
        onConfirm={async () => {
          await doAction(() => api.reset(sid, token!), true);
          setResetOpen(false);
        }}
      />
    </View>
  );
}

function Header({
  sid,
  connected,
  onBack,
  onReset,
  canReset,
}: {
  sid: string;
  connected: boolean;
  onBack: () => void;
  onReset: () => void;
  canReset: boolean;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        testID="back-button"
        onPress={onBack}
        hitSlop={8}
        style={styles.hIcon}
      >
        <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.hLabel}>SESSION</Text>
        <Text style={styles.hSid}>{sid}</Text>
      </View>
      <View style={[styles.syncPill, !connected && styles.syncPillOff]}>
        <View
          style={[
            styles.dot,
            { backgroundColor: connected ? colors.success : colors.error },
          ]}
        />
        <Text style={styles.syncText}>{connected ? "Live" : "Offline"}</Text>
      </View>
      {canReset && (
        <Pressable
          testID="reset-button"
          onPress={onReset}
          hitSlop={8}
          style={styles.hIcon}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={colors.onSurfaceSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

function RosterCard({ team }: { team: any }) {
  const captain = team.players[0];
  const rest = team.players.slice(1);
  return (
    <View style={styles.roster} testID={`roster-${team.id}`}>
      <View style={styles.rosterHead}>
        <Text style={styles.rosterName}>{team.name}</Text>
        <Text style={styles.rosterSlots}>
          {team.players.length}/{TEAM_SIZE}
        </Text>
      </View>
      <View style={styles.rosterSpend}>
        <Text style={styles.spent}>Spent ${fmt(team.totalSpent)}</Text>
        <Text style={styles.left}>Left ${fmt(team.budget)}</Text>
      </View>
      {captain && (
        <Text style={styles.captainRow} numberOfLines={1}>
          ⭐ {captain.Name} · {captain.utr} · ${captain.acquiredPrice / 1000}k
        </Text>
      )}
      {rest.map((p: any) => (
        <Text key={p.id} style={styles.playerRow} numberOfLines={1}>
          {p.Name} · {p.utr} · ${p.acquiredPrice / 1000}k
        </Text>
      ))}
      {rest.length === 0 && (
        <Text style={styles.emptyRoster}>No players acquired yet</Text>
      )}
    </View>
  );
}

function ResetModal({
  visible,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard} testID="reset-modal">
          <Text style={styles.modalTitle}>Reset auction?</Text>
          <Text style={styles.modalBody}>
            This clears all bids and rosters and starts the session over. This
            cannot be undone.
          </Text>
          <View style={styles.modalRow}>
            <Pressable
              testID="reset-cancel"
              style={styles.modalCancel}
              onPress={onCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="reset-confirm"
              style={styles.modalConfirm}
              onPress={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.modalConfirmText}>Reset</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  boot: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  bootText: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  hLabel: {
    color: colors.onSurfaceTertiary,
    fontFamily: font.text,
    fontSize: 10,
    letterSpacing: 1,
  },
  hSid: {
    color: colors.onSurface,
    fontFamily: font.display,
    fontSize: 22,
    letterSpacing: 2,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  syncPillOff: { backgroundColor: "rgba(239,68,68,0.12)" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  syncText: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 11,
  },

  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  contextWarn: { borderColor: colors.error },
  ctxPlayer: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 22,
  },
  ctxMeta: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 12,
    marginTop: 2,
  },
  ctxHigh: {
    color: colors.onBrandTertiary,
    fontFamily: font.displaySemi,
    fontSize: 14,
    marginTop: 3,
  },
  timerBox: {
    minWidth: 64,
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  timerBoxWarn: { backgroundColor: colors.error },
  timerNum: {
    color: colors.brand,
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 36,
  },
  timerLabel: {
    color: colors.onBrandTertiary,
    fontFamily: font.displayMed,
    fontSize: 10,
    letterSpacing: 2,
  },

  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
  },
  progressText: {
    color: colors.onSurfaceTertiary,
    fontFamily: font.text,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  actionErr: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  actionErrText: {
    color: colors.error,
    fontFamily: font.text,
    fontSize: 12,
    flex: 1,
  },

  sectionLabel: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.displayMed,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  statusCard: {
    width: CARD_W,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
  },
  statusName: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 15,
  },
  statusMeta: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 11,
  },
  statusBid: {
    color: colors.onBrandTertiary,
    fontFamily: font.displaySemi,
    fontSize: 16,
    marginTop: 2,
  },
  statusNoBid: {
    color: colors.onSurfaceTertiary,
    fontFamily: font.text,
    fontSize: 12,
    marginTop: 2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  bidCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bidCardPinned: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
  },
  bidCardWinning: { borderColor: colors.success, borderWidth: 2 },
  bidCardTied: { borderColor: colors.warning, borderWidth: 2 },
  bidHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  teamName: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 16,
  },
  teamMeta: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 11,
    marginTop: 1,
  },
  bidInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.onSurface,
    fontFamily: font.text,
    fontSize: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    flexGrow: 1,
    minWidth: 48,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.onBrandTertiary,
    fontFamily: font.displaySemi,
    fontSize: 13,
  },
  cardError: { color: colors.error, fontFamily: font.text, fontSize: 11 },
  bidBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    alignItems: "center",
    paddingVertical: 10,
  },
  bidBtnDisabled: { backgroundColor: colors.surfaceTertiary },
  bidBtnText: {
    color: colors.onBrand,
    fontFamily: font.displaySemi,
    fontSize: 15,
  },
  yourBid: {
    color: colors.onBrandTertiary,
    fontFamily: font.text,
    fontSize: 11,
  },

  strip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    opacity: 0.7,
  },
  stripName: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 13,
  },
  stripSlots: { color: colors.onSurfaceTertiary, fontSize: 11 },
  stripReason: {
    color: colors.onSurfaceTertiary,
    fontFamily: font.text,
    fontSize: 11,
    fontStyle: "italic",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rostersBtn: {
    width: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rostersBtnWide: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  rostersBtnText: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 16,
  },
  skipBtn: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  skipText: {
    color: colors.warning,
    fontFamily: font.displaySemi,
    fontSize: 16,
  },
  finalizeBtn: {
    flex: 2,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  finalizeDisabled: { backgroundColor: colors.surfaceTertiary },
  finalizeText: {
    color: colors.surface,
    fontFamily: font.displaySemi,
    fontSize: 15,
  },

  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.success,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  completeText: {
    color: colors.surface,
    fontFamily: font.display,
    fontSize: 22,
    letterSpacing: 1,
  },

  roster: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 3,
  },
  rosterHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rosterName: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 17,
  },
  rosterSlots: {
    color: colors.onBrandTertiary,
    fontFamily: font.displaySemi,
    fontSize: 14,
  },
  rosterSpend: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  spent: { color: colors.error, fontFamily: font.text, fontSize: 12 },
  left: { color: colors.success, fontFamily: font.text, fontSize: 12 },
  captainRow: { color: colors.warning, fontFamily: font.text, fontSize: 12 },
  playerRow: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 12,
  },
  emptyRoster: {
    color: colors.onSurfaceTertiary,
    fontFamily: font.text,
    fontSize: 12,
    fontStyle: "italic",
  },

  sheetTitle: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 20,
    marginBottom: spacing.xs,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 22,
  },
  modalBody: {
    color: colors.onSurfaceSecondary,
    fontFamily: font.text,
    fontSize: 14,
    lineHeight: 20,
  },
  modalRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.onSurface,
    fontFamily: font.displaySemi,
    fontSize: 16,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
  },
  modalConfirmText: {
    color: colors.onBrand,
    fontFamily: font.displaySemi,
    fontSize: 16,
  },
});
