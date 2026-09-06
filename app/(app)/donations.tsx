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
import { Bell, Settings2, Wallet } from "lucide-react-native";

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
};

const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: Status.warning,
  confirmed: Status.success,
  failed: Status.error,
  pending_wire: Status.info,
};

type Filter = "all" | PaymentStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "Tous", value: "all" },
  { label: "Confirmés", value: "confirmed" },
  { label: "En attente", value: "pending" },
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

export default function DonationsScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", donations: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

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

  const visible = useMemo(
    () =>
      filter === "all"
        ? state.donations
        : state.donations.filter((donation) => donation.payment_status === filter),
    [filter, state.donations],
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

    for (const donation of state.donations) {
      if (donation.payment_status === "confirmed") {
        confirmedAmount += donation.amount;
        confirmedCount += 1;
      } else if (
        donation.payment_status === "pending" ||
        donation.payment_status === "pending_wire"
      ) {
        pendingAmount += donation.amount;
        pendingCount += 1;
      }
    }

    return { confirmedAmount, pendingAmount, confirmedCount, pendingCount };
  }, [state.donations]);

  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      all: state.donations.length,
      pending: 0,
      confirmed: 0,
      failed: 0,
      pending_wire: 0,
    };
    for (const donation of state.donations) map[donation.payment_status] += 1;
    return map;
  }, [state.donations]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title={donationsTitle(user?.role)}
        onBack={() => router.back()}
        right={{
          icon: <Settings2 size={20} color={Ink[900]} strokeWidth={1.5} />,
          accessibilityLabel: "Paramètres",
          onPress: () => router.push("/profile/settings"),
        }}
        left={{
          icon: <Bell size={20} color={Ink[900]} strokeWidth={1.5} />,
          accessibilityLabel: "Notifications",
          onPress: () => router.push("/notifications"),
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
        <View style={styles.gutter}>
          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total confirmé</Text>
            <Text style={styles.totalValue}>{formatFCFA(totals.confirmedAmount)}</Text>
            <Text style={styles.totalMeta}>
              {totals.confirmedCount === 1
                ? "1 Jëf confirmé"
                : `${totals.confirmedCount} Jëfs confirmés`}
            </Text>

            {/* Le montant engagé mais pas encore versé, dit séparément. */}
            {totals.pendingCount > 0 ? (
              <View style={styles.pending}>
                <Text style={styles.pendingText}>
                  {formatFCFA(totals.pendingAmount)} en attente de confirmation
                  {totals.pendingCount > 1 ? ` · ${totals.pendingCount} Jëfs` : ""}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        <ChipRow style={styles.filters}>
          {FILTERS.map((item) => (
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
              title={filter === "all" ? "Aucun Jëf pour l'instant" : "Aucun Jëf dans ce filtre"}
              body={
                filter === "all"
                  ? "Vos contributions apparaîtront ici dès votre premier Jëf."
                  : "Essayez « Tous » pour voir l'ensemble de vos Jëfs."
              }
              actionLabel={filter === "all" ? "Voir les Ndiguels" : "Tout afficher"}
              onAction={
                filter === "all" ? () => router.push("/campaigns") : () => setFilter("all")
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
}: {
  donation: Donation;
  onPress?: () => void;
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
          {donation.beneficiary_name
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
