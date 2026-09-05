/**
 * app/(app)/campaign/etat-[id].tsx — l'état d'un Ndiguel, passé au système
 * (phase F).
 *
 * Écran hérité (§5.2). Trois corrections en chemin.
 *
 * ── 🔴 Il n'y avait aucun retour à l'écran ──────────────────────────────────
 *
 * L'écran posait un `<Stack.Screen options={{ title, headerLeft }} />` — sur un
 * en-tête que `app/(app)/_layout.tsx` masque pour toutes ses routes
 * (`screenOptions={{ headerShown: false }}`). Le chevron était donc rendu dans
 * une barre invisible : **aucun bouton de retour n'a jamais été affiché**. Il ne
 * restait que le bouton matériel Android et le geste iOS.
 *
 * Le même défaut touchait `event/[id].tsx`, corrigé dans le même lot.
 *
 * ── « Donateurs » comptait des dons ─────────────────────────────────────────
 *
 * `donation_count` est le **nombre de contributions** (`events/views.py:225`),
 * pas le nombre de personnes : un membre qui donne trois fois y compte pour
 * trois. La tuile s'appelle désormais « Contributions », ce qu'elle est.
 *
 * ── Les montants ────────────────────────────────────────────────────────────
 *
 * `toLocaleString()` rendait un séparateur différent selon l'ICU embarquée, et
 * la vue sérialise ses montants **en chaînes** — voir `normalizeCampaignEtat`,
 * posé en phase F. `formatFCFA` et la frontière règlent les deux.
 */
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Target, TrendingUp, Trophy, Users } from "lucide-react-native";

import { Avatar, getInitials } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { formatFCFA, formatNumber } from "@/lib/format";
import { ContentService } from "@/lib/content.service";
import type { CampaignEtat, Contributor } from "@/types/campaign.types";
import {
  Border,
  GUTTER,
  Ink,
  Pastel,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
  montant,
} from "@/theme";

function parseId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const METHOD_LABELS: Record<string, string> = {
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

/**
 * ⚠ La réponse `/etat/` ne porte **aucun identifiant de don** — la vue compose
 * ses lignes à la main (`events/views.py:229`). La clé est donc composite. Deux
 * dons du même membre, du même montant, le même jour et par le même moyen se
 * confondraient : c'est accepté, ils sont alors interchangeables à l'écran.
 */
function contributorKey(item: Contributor, index: number) {
  return `${item.member_id}-${item.date}-${item.amount}-${index}`;
}

type State =
  | { status: "loading" }
  | { status: "ready"; etat: CampaignEtat }
  | { status: "failed" };

export default function CampaignEtatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const campaignId = parseId(params.id);
  const [state, setState] = useState<State>({ status: "loading" });

  const fetchEtat = useCallback(async (): Promise<State> => {
    if (!campaignId) return { status: "failed" };
    try {
      return { status: "ready", etat: await ContentService.getCampaignEtat(campaignId) };
    } catch {
      return { status: "failed" };
    }
  }, [campaignId]);

  useEffect(() => {
    let active = true;
    fetchEtat().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [fetchEtat]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    fetchEtat().then(setState);
  }, [fetchEtat]);

  const etat = state.status === "ready" ? state.etat : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="État du Ndiguel" onBack={() => router.back()} />

      {state.status === "loading" ? (
        <View style={styles.padded}>
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
        </View>
      ) : null}

      {state.status === "failed" ? (
        <View style={styles.padded}>
          <ErrorState
            body="L'état de ce Ndiguel n'a pas pu être chargé."
            onRetry={campaignId ? retry : undefined}
          />
        </View>
      ) : null}

      {etat ? (
        <FlatList
          data={etat.contributions}
          keyExtractor={contributorKey}
          renderItem={({ item, index }) => (
            <ContributorRow item={item} divided={index > 0} />
          )}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Header etat={etat} />}
          ListEmptyComponent={
            <EmptyState
              picto={<Users size={56} color={Violet[900]} strokeWidth={1.25} />}
              title="Aucune contribution"
              body="Ce Ndiguel n'a pas encore reçu de Jëf."
            />
          }
        />
      ) : null}
    </SafeAreaView>
  );
}

function Header({ etat }: { etat: CampaignEtat }) {
  const progress = etat.goal_amount > 0 ? etat.collected_amount / etat.goal_amount : 0;

  /** Un donateur anonyme n'entre pas au tableau d'honneur : c'est le sens du mot. */
  const topDonors = [...etat.contributions]
    .filter((item) => !item.is_anonymous)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return (
    <View style={styles.header}>
      <Card style={styles.summary}>
        <Text style={styles.campaignName}>{etat.ndiguel_name}</Text>
        <ProgressBar
          progress={progress}
          leftLabel={formatFCFA(etat.collected_amount)}
          rightLabel={etat.goal_amount > 0 ? `sur ${formatFCFA(etat.goal_amount)}` : undefined}
        />
      </Card>

      <View style={styles.kpiGrid}>
        <Kpi
          icon={<TrendingUp size={16} color={Violet[700]} strokeWidth={1.5} />}
          value={formatNumber(etat.collected_amount)}
          unit="FCFA"
          label="Collecté"
          accent
        />
        <Kpi
          icon={<Target size={16} color={Ink[500]} strokeWidth={1.5} />}
          value={etat.goal_amount > 0 ? formatNumber(etat.goal_amount) : "—"}
          unit={etat.goal_amount > 0 ? "FCFA" : undefined}
          label="Objectif"
        />
        <Kpi
          icon={<Users size={16} color={Ink[500]} strokeWidth={1.5} />}
          value={String(etat.donation_count)}
          /* « Donateurs » était faux : c'est un compte de dons, pas de personnes. */
          label="Contributions"
        />
        <Kpi
          icon={<Trophy size={16} color={Ink[500]} strokeWidth={1.5} />}
          value={`${etat.progress_pct} %`}
          label="Progression"
        />
      </View>

      {topDonors.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Principaux contributeurs</Text>
          <View style={styles.podium}>
            {topDonors.map((donor, index) => (
              <View key={contributorKey(donor, index)} style={styles.podiumItem}>
                <Avatar name={donor.member_name} size={36} />
                <View style={styles.podiumText}>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {donor.member_name}
                  </Text>
                  <Text style={styles.podiumAmount}>{formatFCFA(donor.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {etat.contributions.length > 0 ? (
        <Text style={styles.sectionTitle}>
          Toutes les contributions ({etat.contributions.length})
        </Text>
      ) : null}
    </View>
  );
}

function Kpi({
  icon,
  value,
  unit,
  label,
  accent = false,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.kpi, accent && styles.kpiAccent]}>
      {icon}
      <View style={styles.kpiValueRow}>
        <Text style={[styles.kpiValue, accent && styles.kpiValueAccent]} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={styles.kpiUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function ContributorRow({ item, divided }: { item: Contributor; divided: boolean }) {
  return (
    <View style={[styles.row, divided && styles.rowDivided]}>
      {item.is_anonymous ? (
        <View style={styles.anonymous}>
          <Text style={styles.anonymousMark}>?</Text>
        </View>
      ) : (
        <Avatar name={item.member_name} size={40} />
      )}

      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.is_anonymous ? "Contributeur anonyme" : item.member_name || getInitials(null)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[item.daara_name, new Date(item.date).toLocaleDateString("fr-FR")]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{formatFCFA(item.amount)}</Text>
        <Text style={styles.rowMethod} numberOfLines={1}>
          {METHOD_LABELS[item.payment_method] ?? item.payment_method}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  padded: { paddingHorizontal: GUTTER, paddingTop: Space.sm, gap: Space.md },
  scroll: { paddingHorizontal: GUTTER, paddingBottom: Space.huge },

  header: { gap: Space.lg, paddingBottom: Space.md },
  summary: { gap: Space.md },
  campaignName: { ...Type.cardTitle, color: Ink[900] },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  kpi: {
    flexGrow: 1,
    flexBasis: "47%",
    gap: Space.xs,
    padding: Space.lg,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Surface.alt,
  },
  kpiAccent: { backgroundColor: Violet[100] },
  kpiValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  kpiValue: { ...Type.amountCard, color: Ink[900], flexShrink: 1 },
  kpiValueAccent: { color: montant },
  kpiUnit: { ...Type.micro, color: Ink[300] },
  kpiLabel: { ...Type.label, color: Ink[500] },

  section: { gap: Space.md },
  sectionTitle: { ...UIType.chipLabel, color: Ink[500] },
  podium: { gap: Space.sm },
  podiumItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Pastel.yellow,
  },
  podiumText: { flex: 1, gap: 2 },
  podiumName: { ...UIType.personName, color: Violet[900] },
  podiumAmount: { ...Type.label, color: Violet[900] },

  row: { flexDirection: "row", alignItems: "center", gap: Space.md, paddingVertical: Space.md },
  rowDivided: { borderTopWidth: 1, borderTopColor: Border.hairline },
  anonymous: {
    width: 40,
    height: 40,
    borderRadius: Radius.avatar,
    backgroundColor: Surface.alt,
    alignItems: "center",
    justifyContent: "center",
  },
  anonymousMark: { ...UIType.avatarInitials, color: Ink[300] },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...UIType.personName, color: Ink[900] },
  rowMeta: { ...Type.micro, color: Ink[300] },
  rowRight: { alignItems: "flex-end", gap: 2 },
  rowAmount: { ...Type.label, fontFamily: Type.amountCard.fontFamily, color: montant },
  rowMethod: { ...Type.micro, color: Ink[300] },
});
