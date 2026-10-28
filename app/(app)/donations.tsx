/**
 * app/(app)/donations.tsx — la liste des Jëfs, passée au système (phase F).
 *
 * ⚠ Le titre suit le RÔLE, parce que la donnée servie en dépend : un
 * collecteur y voit ce qu'il a encaissé, pas ce qu'il a donné. Voir
 * `donationsTitle` dans `lib/roles.ts`.
 *
 * Écran hérité (§5.2). Une correction de fond, sur le chiffre qui compte.
 *
 * ── 🔴 « Total contribué » comptait les paiements ÉCHOUÉS ───────────────────
 *
 *     const total = donations.reduce((sum, d) => sum + d.amount, 0);
 *
 * Toutes lignes confondues : `pending`, `pending_wire`, et **`failed`**. Un
 * membre dont trois paiements Orange Money avaient échoué voyait donc son
 * « Total contribué » gonflé du montant qu'il n'avait jamais versé — et il
 * n'existe aucun endroit dans l'application où ce chiffre soit corrigé.
 *
 * Sur un écran d'argent, c'est la pire erreur possible : elle ne se remarque
 * qu'au moment où quelqu'un demande des comptes. **Seuls les dons `confirmed`
 * sont sommés**, et la carte porte désormais « Total confirmé » — le mot dit
 * la règle.
 *
 * Le montant en attente est affiché à part : il existe, il n'est simplement
 * pas encore versé.
 *
 * ── Le reste ────────────────────────────────────────────────────────────────
 *
 * — L'icône `Filter` en bout de rangée de filtres n'était pas pressable :
 *   décor en forme de commande. Retirée.
 * — « Les contributions apparaîtront ici après synchronisation avec le
 *   backend » : le mot « backend » n'a rien à faire devant un talibé.
 * — L'engrenage de l'en-tête menait à `/profile`. Depuis la phase E, les
 *   réglages ont leur route : `/profile/settings`.
 * — Le chiffre FCFA passe au vert `montant` — la seule exception verte du
 *   contrat de tokens — et à `formatFCFA`, qui pose l'espace insécable que
 *   `toLocaleString` rendait différemment d'un appareil à l'autre.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Settings2, Wallet } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { formatFCFA } from "@/lib/format";
import { ContentService } from "@/lib/content.service";
import { donationsTitle } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";
import type { AnyPaymentMethod, Donation, PaymentStatus } from "@/types/donation.types";
import {
  GUTTER,
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

/**
 * L'historique remonte aussi des dons anciens : les valeurs héritées
 * (`LegacyPaymentMethod`) restent ici, elles ne sont plus émises mais elles
 * sont en base.
 */
const PAYMENT_LOGOS: Partial<Record<AnyPaymentMethod, number>> = {
  orange_money: require("@/assets/images/orange money.png"),
  wave: require("@/assets/images/wave.png"),
  bictorys: require("@/assets/images/carte-paiement.png"),
  virement: require("@/assets/images/banque.png"),
  manual: require("@/assets/images/collecteur.png"),
  collector: require("@/assets/images/collecteur.png"),
  visa: require("@/assets/images/carte-paiement.png"),
  mastercard: require("@/assets/images/mastercard.png"),
  paypal: require("@/assets/images/pay-pal.png"),
};

const METHOD_LABELS: Record<AnyPaymentMethod, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  bictorys: "Carte bancaire",
  virement: "Virement",
  manual: "Collecteur",
  collector: "Collecteur",
  visa: "Carte bancaire",
  mastercard: "Carte bancaire",
  paypal: "PayPal",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  failed: "Échoué",
  pending_wire: "Virement en attente",
  collected: "Encaissé, à remettre",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: Status.warning,
  confirmed: Status.success,
  failed: Status.error,
  pending_wire: Status.info,
  collected: Status.info,
  cancelled: Ink[500],
};

type Filter = "all" | PaymentStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "Tous", value: "all" },
  { label: "Confirmés", value: "confirmed" },
  { label: "En attente", value: "pending" },
  /* Affiché seulement s'il y en a : un filtre toujours vide est du bruit. */
  { label: "Encaissés", value: "collected" },
  { label: "Échoués", value: "failed" },
];

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface State {
  status: "loading" | "ready" | "failed";
  donations: Donation[];
}

async function fetchDonations(): Promise<State> {
  try {
    return { status: "ready", donations: await ContentService.getDonations() };
  } catch {
    return { status: "failed", donations: [] };
  }
}

/**
 * Le collecteur est un talibé AVANT d'être collecteur : ses Jëfs à lui et ceux
 * qu'il a encaissés pour d'autres ne se mélangent pas. Mêlés, son « Total
 * confirmé » additionnait l'argent des autres au sien. Sa portée serveur
 * contient en outre les demandes de collecte ouvertes, qui ne sont ni l'un ni
 * l'autre (elles vivent sur l'écran « À collecter »).
 *
 * Le coordinateur et l'administrateur gardent leur registre entier : il
 * contient déjà leurs encaissements.
 */
type Scope = "mine" | "collected";

export default function DonationsScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", donations: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [scope, setScope] = useState<Scope>("mine");
  const segmented = user?.role === "collector";

  useEffect(() => {
    let active = true;
    fetchDonations().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchDonations().then(setState);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchDonations()
      .then(setState)
      .finally(() => setRefreshing(false));
  }, []);

  const mine = useMemo(
    () => (segmented ? state.donations.filter((d) => d.donor === user?.id) : state.donations),
    [segmented, state.donations, user?.id],
  );
  const collected = useMemo(
    () =>
      segmented
        ? state.donations.filter((d) => d.collector === user?.id && d.donor !== user?.id)
        : [],
    [segmented, state.donations, user?.id],
  );
  const scoped = scope === "collected" ? collected : mine;
  const onCollected = segmented && scope === "collected";

  const visible = useMemo(
    () =>
      filter === "all"
        ? scoped
        : scoped.filter((donation) => donation.payment_status === filter),
    [filter, scoped],
  );

  /**
   * ⚠ `confirmed` SEULEMENT pour le total. Un `failed` n'est pas une
   * contribution, un `pending` n'en est pas encore une.
   */
  const totals = useMemo(() => {
    let confirmedAmount = 0;
    let pendingAmount = 0;
    let confirmedCount = 0;
    let pendingCount = 0;

    for (const donation of scoped) {
      if (donation.payment_status === "confirmed") {
        confirmedAmount += donation.amount;
        confirmedCount += 1;
      } else if (
        donation.payment_status === "pending" ||
        donation.payment_status === "pending_wire" ||
        donation.payment_status === "collected"
      ) {
        pendingAmount += donation.amount;
        pendingCount += 1;
      }
    }

    return { confirmedAmount, pendingAmount, confirmedCount, pendingCount };
  }, [scoped]);

  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      all: scoped.length,
      pending: 0,
      confirmed: 0,
      failed: 0,
      pending_wire: 0,
      collected: 0,
      cancelled: 0,
    };
    for (const donation of scoped) map[donation.payment_status] += 1;
    return map;
  }, [scoped]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/*
        🔴 LA CLOCHE OCCUPAIT L'EMPLACEMENT DU RETOUR.

        `onBack` et `left` étaient passés tous les deux. Or `ScreenHeader` lit
        `left ?? (onBack ? chevron : undefined)` : un `left` explicite SUPPLANTE
        le chevron, sans rien signaler. « Mes Jëfs » s'ouvre depuis le Profil et
        n'est pas un onglet — l'écran n'avait donc aucune sortie visible, et le
        seul bouton en haut à gauche emmenait aux Notifications, c'est-à-dire
        plus loin encore.

        Le chevron reprend sa place. Les Notifications ne sont pas réintroduites
        ailleurs dans cet en-tête : elles sont à l'accueil et au tiroir, et un
        écran d'historique de dons n'est pas l'endroit où on les cherche.
      */}
      <ScreenHeader
        title={segmented ? (onCollected ? "Jëfs collectés" : "Mes Jëfs") : donationsTitle(user?.role)}
        onBack={() => router.back()}
        right={{
          icon: <Settings2 size={20} color={Ink[900]} strokeWidth={1.5} />,
          accessibilityLabel: "Paramètres",
          onPress: () => router.push("/profile/settings"),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Violet[500]}
          />
        }
      >
        {segmented ? (
          <ChipRow style={styles.filters}>
            <Chip
              label="Mes Jëfs"
              active={scope === "mine"}
              count={mine.length}
              onPress={() => {
                setScope("mine");
                setFilter("all");
              }}
            />
            <Chip
              label="Jëfs collectés"
              active={scope === "collected"}
              count={collected.length}
              onPress={() => {
                setScope("collected");
                setFilter("all");
              }}
            />
          </ChipRow>
        ) : null}

        <View style={styles.gutter}>
          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>
              {onCollected ? "Collectes confirmées" : "Total confirmé"}
            </Text>
            <Text style={styles.totalValue}>{formatFCFA(totals.confirmedAmount)}</Text>
            <Text style={styles.totalMeta}>
              {totals.confirmedCount === 1
                ? "1 Jëf confirmé"
                : `${totals.confirmedCount} Jëfs confirmés`}
            </Text>

            {/* Le montant engagé mais pas encore versé, dit séparément. Côté
                collectes, c'est l'argent que le collecteur détient encore. */}
            {totals.pendingCount > 0 ? (
              <View style={styles.pending}>
                <Text style={styles.pendingText}>
                  {formatFCFA(totals.pendingAmount)}{" "}
                  {onCollected ? "encaissé, à remettre" : "en attente de confirmation"}
                  {totals.pendingCount > 1 ? ` · ${totals.pendingCount} Jëfs` : ""}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        <ChipRow style={styles.filters}>
          {FILTERS.filter((item) => item.value !== "collected" || counts.collected > 0).map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              active={filter === item.value}
              count={counts[item.value]}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </ChipRow>

        {state.status === "loading" ? (
          <View style={styles.list}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : null}

        {state.status === "failed" ? (
          <View style={styles.gutter}>
            <ErrorState body="Votre historique n'a pas pu être chargé." onRetry={reload} />
          </View>
        ) : null}

        {state.status === "ready" && visible.length === 0 ? (
          <View style={styles.gutter}>
            <EmptyState
              picto={<Wallet size={56} color={Violet[900]} strokeWidth={1.25} />}
              title={
                filter !== "all"
                  ? "Aucun Jëf dans ce filtre"
                  : onCollected
                    ? "Aucune collecte pour l'instant"
                    : "Aucun Jëf pour l'instant"
              }
              body={
                filter !== "all"
                  ? "Essayez « Tous » pour voir l'ensemble de vos Jëfs."
                  : onCollected
                    ? "Les Jëfs que vous encaissez pour d'autres membres apparaîtront ici."
                    : "Vos contributions apparaîtront ici dès votre premier Jëf."
              }
              actionLabel={
                filter !== "all" ? "Tout afficher" : onCollected ? "Voir les demandes" : "Voir les Ndiguels"
              }
              onAction={
                filter !== "all"
                  ? () => setFilter("all")
                  : onCollected
                    ? () => router.push("/collect")
                    : () => router.push("/campaigns")
              }
            />
          </View>
        ) : null}

        {visible.length > 0 ? (
          <View style={styles.list}>
            {visible.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                showDonor={onCollected}
                onPress={
                  donation.campaign
                    ? () => router.push(`/campaign/${donation.campaign}`)
                    : undefined
                }
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DonationCard({
  donation,
  onPress,
  showDonor = false,
}: {
  donation: Donation;
  onPress?: () => void;
  /** Côté collectes : de qui vient l'argent, pas « En mon nom ». */
  showDonor?: boolean;
}) {
  const logo = PAYMENT_LOGOS[donation.payment_method];
  const statusColor = STATUS_COLORS[donation.payment_status];

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${donation.campaign_name ?? "Ndiguel"} — ${formatFCFA(donation.amount)}`}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.logoWrap}>
          {logo ? (
            <ExpoImage source={logo} style={styles.logo} contentFit="contain" />
          ) : (
            <Wallet size={18} color={Violet[900]} strokeWidth={1.5} />
          )}
        </View>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {/* `campaign_name` est servi par `DonationSerializer` ; le repli sur
                l'identifiant reste utile pour un Ndiguel supprimé. */}
            {donation.campaign_name ?? `Ndiguel n° ${donation.campaign}`}
          </Text>
          <Text style={styles.cardSub}>
            {METHOD_LABELS[donation.payment_method] ?? donation.payment_method} ·{" "}
            {formatDate(donation.created_at)}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: `${statusColor}14` }]}>
          <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
            {STATUS_LABELS[donation.payment_status]}
          </Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text
          style={[
            styles.amount,
            /* Un montant échoué n'est pas un montant versé : il perd le vert. */
            donation.payment_status !== "confirmed" && styles.amountUnconfirmed,
          ]}
        >
          {formatFCFA(donation.amount)}
        </Text>
        <Text style={styles.beneficiary}>
          {showDonor
            ? `De ${donation.donor_name || "—"}`
            : donation.beneficiary_name
              ? `Pour ${donation.beneficiary_name}`
              : "En mon nom"}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: { paddingTop: Space.sm, paddingBottom: 120, gap: Space.lg },
  gutter: { paddingHorizontal: GUTTER },
  filters: { paddingHorizontal: GUTTER },
  list: { paddingHorizontal: GUTTER, gap: Space.md },

  totalCard: { gap: Space.xs, alignItems: "flex-start" },
  totalLabel: { ...Type.label, color: Ink[500] },
  totalValue: { ...Type.amountHero, fontSize: 34, lineHeight: 40, color: montant },
  totalMeta: { ...Type.label, color: Ink[300] },
  pending: {
    marginTop: Space.md,
    alignSelf: "stretch",
    backgroundColor: Surface.alt,
    borderRadius: Radius.input,
    ...continuous,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  pendingText: { ...Type.label, color: Status.warning },

  card: { gap: Space.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Space.md },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Surface.alt,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 24, height: 24 },
  cardHeading: { flex: 1, gap: 2 },
  cardTitle: { ...UIType.rowTitle, color: Ink[900] },
  cardSub: { ...Type.micro, color: Ink[300] },
  statusChip: {
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.chip,
    maxWidth: 108,
  },
  statusText: { ...UIType.badgeLabel },
  cardBottom: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  amount: { ...Type.amountCard, color: montant },
  amountUnconfirmed: { color: Ink[500] },
  beneficiary: { ...Type.micro, color: Ink[300] },
});
