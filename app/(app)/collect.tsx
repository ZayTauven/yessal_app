/**
 * app/(app)/collect.tsx — « À collecter », l'écran de travail du collecteur.
 *
 * Deux files, dans l'ordre où le collecteur s'en sert :
 *
 *   · DEMANDES — les membres qui ont choisi « Collecteur » et attendent qu'on
 *     passe. Il en était notifié, sans pouvoir les lire nulle part : le serveur
 *     ne lui rendait que ses propres encaissements. Le numéro est en tête de
 *     ligne, parce qu'on appelle avant de se déplacer.
 *   · MA CAISSE — ce qu'il a encaissé et pas encore remis à l'administration.
 *     C'est la somme dont il répond ; elle ne redescend qu'à la remise, que
 *     seul un administrateur valide.
 *
 * « Je m'en charge » marque la demande aux yeux des autres collecteurs de la
 * zone : elle reste dans leur liste, prise, sans action possible pour eux.
 * Le collecteur ne voit que les demandes de SES zones.
 *
 * ── Pourquoi une confirmation DANS la ligne, et pas `Alert.alert` ──────────
 *
 * « Encaisser » envoie le reçu au membre à l'instant et ne se défait pas : il
 * faut une seconde pression. `Alert.alert` avec boutons ne s'affiche pas sur
 * Expo Web — le geste y aurait été silencieusement impossible. La ligne
 * s'ouvre donc sur une question qui répète le nom et le montant.
 */
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { HandCoins, Inbox, Phone, ShieldAlert } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import { formatFCFA } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import type { CollecteStatus, Donation } from "@/types/donation.types";
import {
  GUTTER,
  HIT,
  Ink,
  Radius,
  Space,
  Status,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
  montant,
} from "@/theme";

interface State {
  status: "loading" | "ready" | "failed";
  requests: Donation[];
  cash: Donation[];
  collecte: CollecteStatus | null;
}

const EMPTY: Omit<State, "status"> = { requests: [], cash: [], collecte: null };

/** L'état COMPLET, rendu après l'await : un seul `setState` (React Compiler). */
async function fetchQueues(): Promise<State> {
  try {
    const [requests, cash, collecte] = await Promise.all([
      ContentService.getCollectRequests(),
      ContentService.getMyCash(),
      ContentService.getCollecteStatus(),
    ]);
    return { status: "ready", requests, cash, collecte };
  } catch {
    return { status: "failed", ...EMPTY };
  }
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function CollectScreen() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user?.id);
  const [state, setState] = useState<State>({ status: "loading", ...EMPTY });
  const [refreshing, setRefreshing] = useState(false);
  /** La ligne dont la confirmation est ouverte. Une seule à la fois. */
  const [asking, setAsking] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchQueues().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchQueues()
      .then(setState)
      .finally(() => setRefreshing(false));
  }, []);

  /** Un geste serveur, puis tout l'état rechargé d'un bloc. */
  const act = useCallback(async (id: number, call: () => Promise<unknown>, fallback: string) => {
    setBusy(id);
    setError(null);
    try {
      await call();
      setAsking(null);
      setState(await fetchQueues());
    } catch (e) {
      setError(e instanceof Error ? e.message : fallback);
    } finally {
      setBusy(null);
    }
  }, []);

  const encaisser = (d: Donation) =>
    act(d.id, () => ContentService.collectDonation(d.id), "L'encaissement a échoué. Réessayez.");
  const prendre = (d: Donation) =>
    act(d.id, () => ContentService.claimDonation(d.id), "La prise en charge a échoué.");
  const relacher = (d: Donation) =>
    act(d.id, () => ContentService.releaseDonation(d.id), "La demande n'a pas pu être relâchée.");

  const suspendue = state.collecte?.active === false;

  const cashTotal = state.cash.reduce((sum, d) => sum + d.amount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="À collecter" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Violet[500]} />
        }
      >
        {suspendue ? (
          <View style={styles.gutter}>
            <View style={styles.banner}>
              <ShieldAlert size={18} color={Status.error} strokeWidth={2} />
              <Text style={styles.bannerText}>
                Collecte en espèces suspendue par l’administration : plus aucun encaissement.
                L’argent de votre caisse reste à remettre.
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Ma caisse ── */}
        <View style={styles.gutter}>
          <Card style={styles.cashCard}>
            <Text style={styles.cashLabel}>Ma caisse · à remettre</Text>
            <Text style={styles.cashValue}>{formatFCFA(cashTotal)}</Text>
            <Text style={styles.cashMeta}>
              {state.cash.length === 0
                ? "Rien en caisse."
                : `${state.cash.length} Jëf${state.cash.length > 1 ? "s" : ""} encaissé${
                    state.cash.length > 1 ? "s" : ""
                  }, confirmé${state.cash.length > 1 ? "s" : ""} à votre remise.`}
            </Text>
            {state.cash.map((d) => (
              <View key={d.id} style={styles.cashRow}>
                <Text style={styles.cashName} numberOfLines={1}>
                  {d.donor_name || "—"}
                </Text>
                <Text style={styles.cashAmount}>{formatFCFA(d.amount)}</Text>
              </View>
            ))}
          </Card>
        </View>

        <Text style={[styles.section, styles.gutter]}>
          Demandes de collecte{state.requests.length > 0 ? ` · ${state.requests.length}` : ""}
        </Text>

        {error ? (
          <View style={styles.gutter}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {state.status === "loading" ? (
          <View style={styles.list}>
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : null}

        {state.status === "failed" ? (
          <View style={styles.gutter}>
            <ErrorState
              body="Les demandes n'ont pas pu être chargées."
              onRetry={() => {
                setState((p) => ({ ...p, status: "loading" }));
                fetchQueues().then(setState);
              }}
            />
          </View>
        ) : null}

        {state.status === "ready" && state.requests.length === 0 ? (
          <View style={styles.gutter}>
            <EmptyState
              picto={<Inbox size={56} color={Violet[900]} strokeWidth={1.25} />}
              title="Aucune demande en attente"
              body="Quand un membre choisit « Collecteur » pour son Jëf, sa demande apparaît ici et vous êtes notifié."
            />
          </View>
        ) : null}

        <View style={styles.list}>
          {state.requests.map((d) => {
            const open = asking === d.id;
            const mine = d.collector === me;
            /* Prise par un collègue : il est en route, aucune action ici. */
            const taken = d.collector != null && !mine;
            return (
              <Card key={d.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardHeading}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {d.donor_name || "—"}
                    </Text>
                    <Text style={styles.cardSub} numberOfLines={2}>
                      {d.donor_daara_name || "Sans Daara"}
                      {d.campaign_name ? ` · ${d.campaign_name}` : ""} · {formatDate(d.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{formatFCFA(d.amount)}</Text>
                </View>

                {d.donor_phone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${d.donor_phone}`)}
                    accessibilityRole="link"
                    accessibilityLabel={`Appeler ${d.donor_name ?? "le membre"}`}
                    style={styles.phone}
                    hitSlop={8}
                  >
                    <Phone size={14} color={Violet[500]} strokeWidth={2} />
                    <Text style={styles.phoneText}>{d.donor_phone}</Text>
                  </Pressable>
                ) : null}

                {d.collector != null ? (
                  <Text style={[styles.claim, mine && styles.claimMine]}>
                    {mine
                      ? "Vous vous en chargez"
                      : `Pris en charge par ${d.collector_name || "un collègue"}`}
                  </Text>
                ) : null}

                {taken || suspendue ? null : open ? (
                  <View style={styles.confirm}>
                    <Text style={styles.confirmText}>
                      Avez-vous reçu {formatFCFA(d.amount)} de {d.donor_name || "ce membre"} ? Il
                      reçoit son reçu immédiatement.
                    </Text>
                    {/* Empilés : côte à côte dans l'encadré, à 390 px, il
                        restait ~130 px par bouton et « Oui, encaissé » était
                        tronqué. La réponse attendue vient en premier. */}
                    <View style={styles.confirmStack}>
                      <Button
                        label="Oui, encaissé"
                        size="md"
                        loading={busy === d.id}
                        disabled={busy !== null}
                        onPress={() => encaisser(d)}
                      />
                      <Button
                        label="Retour"
                        variant="secondary"
                        size="md"
                        onPress={() => setAsking(null)}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.confirmActions}>
                    <Button
                      label={mine ? "Je ne peux plus" : "Je m'en charge"}
                      variant="secondary"
                      size="md"
                      fullWidth={false}
                      style={styles.flex}
                      loading={busy === d.id}
                      disabled={busy !== null}
                      onPress={() => (mine ? relacher(d) : prendre(d))}
                    />
                    <Button
                      label="Encaisser"
                      variant="outline"
                      size="md"
                      fullWidth={false}
                      style={styles.flex}
                      icon={<HandCoins size={16} color={Violet[900]} strokeWidth={2} />}
                      onPress={() => {
                        setError(null);
                        setAsking(d.id);
                      }}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: { paddingTop: Space.sm, paddingBottom: 120, gap: Space.lg },
  gutter: { paddingHorizontal: GUTTER },
  list: { paddingHorizontal: GUTTER, gap: Space.md },
  flex: { flex: 1 },

  cashCard: { gap: Space.xs },
  cashLabel: { ...Type.label, color: Ink[500] },
  cashValue: { ...Type.amountHero, fontSize: 34, lineHeight: 40, color: montant },
  cashMeta: { ...Type.label, color: Ink[300], marginBottom: Space.xs },
  cashRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Space.sm,
    paddingVertical: Space.xs,
  },
  cashName: { ...Type.micro, color: Ink[500], flex: 1 },
  cashAmount: { ...Type.micro, color: Ink[900] },

  section: { ...UIType.rowTitle, color: Ink[900] },
  error: { ...Type.label, color: Status.error },

  card: { gap: Space.md },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  cardHeading: { flex: 1, gap: 2 },
  cardTitle: { ...UIType.rowTitle, color: Ink[900] },
  cardSub: { ...Type.micro, color: Ink[300] },
  amount: { ...Type.amountCard, color: montant },
  phone: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    minHeight: HIT,
    alignSelf: "flex-start",
  },
  phoneText: { ...UIType.chipLabel, color: Violet[500] },
  confirm: {
    gap: Space.md,
    backgroundColor: Surface.alt,
    borderRadius: Radius.input,
    ...continuous,
    padding: Space.md,
  },
  confirmText: { ...Type.label, color: Ink[900] },
  confirmActions: { flexDirection: "row", gap: Space.sm },
  confirmStack: { gap: Space.sm },
  claim: { ...UIType.badgeLabel, color: Ink[500] },
  claimMine: { color: Status.success },
  banner: {
    flexDirection: "row",
    gap: Space.sm,
    alignItems: "flex-start",
    backgroundColor: Surface.alt,
    borderRadius: Radius.input,
    ...continuous,
    padding: Space.md,
  },
  bannerText: { ...Type.label, color: Ink[900], flex: 1 },
});
