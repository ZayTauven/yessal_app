/**
 * app/(app)/event/[id].tsx — le tableau d'une fête, passé au système (phase F).
 *
 * Écran hérité (§5.2). Il lit `GET /events/fetes/{id}/etat/`, pas
 * `FeteSerializer` : il échappe donc aux cinq champs fantômes d'`EventItem`.
 * Quatre corrections tout de même.
 *
 * ── 🔴 Aucun retour à l'écran ───────────────────────────────────────────────
 *
 * Même défaut que `campaign/etat-[id]` : un `headerLeft` posé sur un en-tête
 * que `app/(app)/_layout.tsx` masque. Le chevron n'a jamais été rendu.
 *
 * ── « Donateurs » comptait des dons ─────────────────────────────────────────
 *
 * `donation_count` compte les contributions confirmées, pas les personnes
 * (`events/views.py:101`). Renommé « Contributions ».
 *
 * ── Les montants arrivaient en chaînes ──────────────────────────────────────
 *
 * La vue sérialise `total_collected` et les montants de chaque Ndiguel avec
 * `str(...)`. L'écran compensait au coup par coup — `Number(etat.total_collected)`
 * ici, `Number(d.amount)` là, rien ailleurs. `normalizeFeteEtat`, posé en
 * phase F, rend la frontière franche : ce qui arrive ici est un nombre.
 *
 * ── `recurrence` n'est pas un code ──────────────────────────────────────────
 *
 * Contrairement à `FeteSerializer`, cette vue rend `get_recurrence_display()` —
 * « Annuelle », pas « annual ». Elle s'affiche telle quelle et ne se compare à
 * rien.
 */
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookOpen, Calendar, TrendingUp, Users } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { formatFCFA, formatNumber } from "@/lib/format";
import { ContentService } from "@/lib/content.service";
import type { Contributor, FeteCampaign, FeteEtat } from "@/types/campaign.types";
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

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
  completed: "Terminé",
  inactive: "Inactif",
};

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

/** Voir `campaign/etat-[id].tsx` : la réponse ne porte aucun identifiant de don. */
function contributorKey(item: Contributor, index: number) {
  return `${item.member_id}-${item.date}-${item.amount}-${index}`;
}

function formatDate(raw?: string | null) {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type State =
  | { status: "loading" }
  | { status: "ready"; etat: FeteEtat }
  | { status: "failed" };

export default function FeteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const feteId = parseId(params.id);
  const [state, setState] = useState<State>({ status: "loading" });

  const fetchEtat = useCallback(async (): Promise<State> => {
    if (!feteId) return { status: "failed" };
    try {
      return { status: "ready", etat: await ContentService.getFeteEtat(feteId) };
    } catch {
      return { status: "failed" };
    }
  }, [feteId]);

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

  /** Un anonyme n'entre pas au tableau d'honneur. */
  const topDonors = etat
    ? [...etat.contributions]
        .filter((item) => !item.is_anonymous)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={etat?.name ?? "Fête"} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {state.status === "loading" ? (
          <>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </>
        ) : null}

        {state.status === "failed" ? (
          <ErrorState
            body="Le tableau de cette fête n'a pas pu être chargé."
            onRetry={feteId ? retry : undefined}
          />
        ) : null}

        {etat ? (
          <>
            <View style={styles.intro}>
              <View style={styles.introHead}>
                <Text style={styles.feteName}>{etat.name}</Text>
                <Badge
                  label={etat.is_active ? "Active" : "Retirée"}
                  tone={etat.is_active ? "active" : "closed"}
                />
              </View>
              {etat.description ? (
                <Text style={styles.description}>{etat.description}</Text>
              ) : null}
              <View style={styles.introMeta}>
                {formatDate(etat.date) ? (
                  <View style={styles.metaItem}>
                    <Calendar size={13} color={Ink[300]} strokeWidth={1.5} />
                    <Text style={styles.metaText}>{formatDate(etat.date)}</Text>
                  </View>
                ) : null}
                {/* Libellé humain rendu par le serveur, jamais un code. */}
                {etat.recurrence ? (
                  <Text style={styles.metaText}>{etat.recurrence}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.kpiGrid}>
              <Kpi
                icon={<TrendingUp size={16} color={Violet[700]} strokeWidth={1.5} />}
                value={formatNumber(etat.total_collected)}
                unit="FCFA"
                label="Collecté"
                accent
              />
              <Kpi
                icon={<Users size={16} color={Ink[500]} strokeWidth={1.5} />}
                value={String(etat.donation_count)}
                label="Contributions"
              />
              <Kpi
                icon={<BookOpen size={16} color={Ink[500]} strokeWidth={1.5} />}
                value={String(etat.campaigns_count)}
                label="Ndiguels"
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
                        {donor.campaign_name ? (
                          <Text style={styles.podiumCampaign} numberOfLines={1}>
                            {donor.campaign_name}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {etat.campaigns.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Ndiguels associés ({etat.campaigns.length})
                </Text>
                <Card padded={false} style={styles.listCard}>
                  {etat.campaigns.map((campaign, index) => (
                    <CampaignRow
                      key={campaign.id}
                      item={campaign}
                      divided={index > 0}
                      onPress={() => router.push(`/campaign/etat-${campaign.id}`)}
                    />
                  ))}
                </Card>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Contributions ({etat.contributions.length})
              </Text>
              {etat.contributions.length === 0 ? (
                <EmptyState
                  picto={<Users size={56} color={Violet[900]} strokeWidth={1.25} />}
                  title="Aucune contribution confirmée"
                  body="Les Jëfs confirmés pour cette fête apparaîtront ici."
                />
              ) : (
                <Card padded={false} style={styles.listCard}>
                  {etat.contributions.map((item, index) => (
                    <ContributorRow
                      key={contributorKey(item, index)}
                      item={item}
                      divided={index > 0}
                    />
                  ))}
                </Card>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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

function CampaignRow({
  item,
  divided,
  onPress,
}: {
  item: FeteCampaign;
  divided: boolean;
  onPress: () => void;
}) {
  const goal = item.goal_amount ?? 0;
  const progress = goal > 0 ? Math.min(item.collected_amount / goal, 1) : 0;

  return (
    <Card
      padded={false}
      onPress={onPress}
      accessibilityLabel={`État du Ndiguel ${item.name}`}
      style={[styles.campaignRow, divided && styles.divided]}
    >
      <View style={styles.campaignHead}>
        <View style={styles.campaignHeading}>
          <Text style={styles.campaignName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.campaignMeta} numberOfLines={1}>
            {[item.daara_name, new Date(item.deadline).toLocaleDateString("fr-FR")]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <View style={styles.campaignRight}>
          <Badge
            label={STATUS_LABELS[item.status] ?? item.status}
            tone={item.status === "active" ? "active" : "closed"}
          />
          <Text style={styles.campaignAmount}>{formatFCFA(item.collected_amount)}</Text>
        </View>
      </View>

      {goal > 0 ? (
        <ProgressBar
          progress={progress}
          rightLabel={`${item.progress_pct} %`}
          style={styles.campaignProgress}
        />
      ) : null}
    </Card>
  );
}

function ContributorRow({ item, divided }: { item: Contributor; divided: boolean }) {
  return (
    <View style={[styles.row, divided && styles.divided]}>
      {item.is_anonymous ? (
        <View style={styles.anonymous}>
          <Text style={styles.anonymousMark}>?</Text>
        </View>
      ) : (
        <Avatar name={item.member_name} size={40} />
      )}

      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.is_anonymous ? "Contributeur anonyme" : item.member_name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[item.campaign_name, item.daara_name, new Date(item.date).toLocaleDateString("fr-FR")]
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
  scroll: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: Space.huge,
    gap: Space.lg,
  },

  intro: { gap: Space.sm },
  introHead: { flexDirection: "row", alignItems: "center", gap: Space.md },
  feteName: { ...Type.greeting, color: Ink[900], flex: 1 },
  description: { ...Type.body, color: Ink[500] },
  introMeta: { flexDirection: "row", alignItems: "center", gap: Space.lg },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { ...Type.micro, color: Ink[300] },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  kpi: {
    flexGrow: 1,
    flexBasis: "30%",
    gap: Space.xs,
    padding: Space.lg,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Surface.alt,
  },
  kpiAccent: { flexBasis: "100%", backgroundColor: Violet[100] },
  kpiValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  kpiValue: { ...Type.amountCard, color: Ink[900], flexShrink: 1 },
  kpiValueAccent: { color: montant },
  kpiUnit: { ...Type.micro, color: Ink[300] },
  kpiLabel: { ...Type.label, color: Ink[500] },

  section: { gap: Space.md },
  sectionTitle: { ...UIType.chipLabel, color: Ink[500] },
  listCard: { paddingHorizontal: Space.xl },
  divided: { borderTopWidth: 1, borderTopColor: Border.hairline },

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
  podiumCampaign: { ...Type.micro, color: Violet[900], opacity: 0.75 },

  campaignRow: { gap: Space.sm, paddingVertical: Space.lg, backgroundColor: "transparent" },
  campaignHead: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  campaignHeading: { flex: 1, gap: 2 },
  campaignName: { ...UIType.rowTitle, color: Ink[900] },
  campaignMeta: { ...Type.micro, color: Ink[300] },
  campaignRight: { alignItems: "flex-end", gap: Space.xs },
  campaignAmount: { ...Type.label, fontFamily: Type.amountCard.fontFamily, color: montant },
  campaignProgress: { marginTop: Space.xs },

  row: { flexDirection: "row", alignItems: "center", gap: Space.md, paddingVertical: Space.md },
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
