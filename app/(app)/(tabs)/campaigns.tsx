/**
 * app/(app)/(tabs)/campaigns.tsx — la liste des Ndiguels.
 *
 * Planche « Accueil et Onglets », vues `ndiguelsFull` et `ndiguelsEmpty`.
 *
 * En-tête (tiroir · titre · loupe), rangée de filtres, puis une LISTE
 * VERTICALE de rangées — vignette 64, titre, métadonnées, statut, chevron.
 * L'ancien écran affichait une grille de deux colonnes avec des illustrations
 * décoratives en couverture ; ni la grille ni les illustrations ne sont sur la
 * planche.
 *
 * CE QUI A DISPARU — trois Ndiguels factices. L'écran retombait sur
 * `FALLBACK_CAMPAIGNS` (« Rénovation de la grande mosquée », « Soutien aux
 * étudiants », « Distribution Ramadan ») dès que l'API échouait OU renvoyait
 * une liste vide. Un écran de démonstration qui invente des appels aux dons
 * d'une confrérie n'est pas acceptable : le vide et l'erreur ont maintenant
 * leurs états propres, comme le demande le brief §4.4.
 *
 * LA RECHERCHE est conservée mais passe derrière la loupe de l'en-tête, comme
 * sur la planche. Le §5.3 la disait « absente du produit, deuxième lot » — elle
 * existe pourtant et fonctionne ; la retirer aurait été une régression.
 */
import { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Menu, Plus, Scroll, Search, X } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { TAB_BAR_SPACE } from "@/components/navigation/TabBar";
import { campaignVisual } from "@/lib/campaign-visuals";
import { canSeeAmounts } from "@/lib/roles";
import { ContentService } from "@/lib/content.service";
import { formatCountdown, formatFCFA } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import type { Campaign, CampaignStatus } from "@/types/campaign.types";
import {
  Font,
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

type Filter = CampaignStatus | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "En cours" },
  { key: "completed", label: "Clôturés" },
  { key: "pending", label: "À venir" },
];

/**
 * Libellé et ton de chaque statut. Le ton est sémantique, pas décoratif :
 * violet pour ce qui appelle une action, ambre pour ce qui attend, gris pour
 * ce qui est derrière nous.
 */
const STATUS: Record<CampaignStatus, { label: string; tone: string }> = {
  active: { label: "En cours", tone: Violet[700] },
  pending: { label: "À venir", tone: Status.warning },
  completed: { label: "Clôturé", tone: Ink[300] },
  inactive: { label: "Inactif", tone: Ink[300] },
};

interface ListState {
  status: "loading" | "ready" | "failed";
  campaigns: Campaign[];
}

async function fetchCampaigns(): Promise<ListState> {
  try {
    return { status: "ready", campaigns: await ContentService.getCampaigns() };
  } catch {
    return { status: "failed", campaigns: [] };
  }
}

export default function CampaignsScreen() {
  const router = useRouter();
  const openDrawer = useUiStore((state) => state.openDrawer);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const showsAmounts = canSeeAmounts(user?.role);
  const role = user?.role;

  const [state, setState] = useState<ListState>({ status: "loading", campaigns: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    fetchCampaigns().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setState(await fetchCampaigns());
    setRefreshing(false);
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.campaigns.filter((campaign) => {
      if (filter !== "all" && campaign.status !== filter) return false;
      if (!query) return true;
      return (
        campaign.name.toLowerCase().includes(query) ||
        (campaign.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [state.campaigns, filter, search]);

  const loading = state.status === "loading";
  const failed = state.status === "failed";
  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? "Tous";

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton
          icon={<Menu size={20} color={Ink[900]} strokeWidth={1.6} />}
          onPress={openDrawer}
          accessibilityLabel="Ouvrir le menu"
        />
        <Text style={styles.title}>Ndiguels</Text>
        <IconButton
          icon={
            searchOpen ? (
              <X size={20} color={Ink[900]} strokeWidth={1.5} />
            ) : (
              <Search size={20} color={Ink[900]} strokeWidth={1.5} />
            )
          }
          onPress={() => {
            setSearchOpen((open) => !open);
            setSearch("");
          }}
          accessibilityLabel={searchOpen ? "Fermer la recherche" : "Rechercher un Ndiguel"}
        />
        {/*
          🔴 CE BOUTON S'OUVRAIT À TOUS LES RÔLES SAUF LA TUTELLE, et le
          commentaire qui l'accompagnait affirmait qu'un talibé « pouvait déjà
          le faire au tableau de bord ». C'ÉTAIT FAUX, et vérifiable en une
          ligne : `CampaignsClient.tsx` n'affiche « Lancer un Ndiguel » que
          derrière `isAdmin`.

          L'erreur venait de ma lecture : j'avais pris `CAMPAIGN_CREATOR_ROLES`
          côté Django pour la règle, alors que cette liste était elle-même le
          défaut — le serveur acceptait ce qu'aucune interface ne proposait.
          UC-06 (`AGENTS/tools/05_use_cases_regles.md`) ne porte qu'un acteur :
          l'administrateur. Les deux sont corrigés.

          `canCollect` ne s'applique PAS : elle désigne qui encaisse pour
          autrui, ce qui est une autre question.
        */}
        {role === "admin" ? (
          <IconButton
            icon={<Plus size={20} color={Ink[900]} strokeWidth={1.8} />}
            onPress={() => router.push("/campaign/new")}
            accessibilityLabel="Lancer un Ndiguel"
          />
        ) : null}
      </View>

      {searchOpen ? (
        <Input
          placeholder="Rechercher un Ndiguel"
          value={search}
          onChangeText={setSearch}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          containerStyle={styles.search}
        />
      ) : null}

      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + TAB_BAR_SPACE + Space.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Violet[500]} />
        }
      >
        {loading ? (
          <>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </>
        ) : failed ? (
          <ErrorState body="Les Ndiguels n'ont pas pu être chargés." onRetry={refresh} />
        ) : visible.length === 0 ? (
          <EmptyState
            picto={<Scroll size={56} color={Violet[900]} strokeWidth={1.5} />}
            title={search ? "Aucun résultat" : "Rien dans ce filtre"}
            body={
              search
                ? `Aucun Ndiguel ne correspond à « ${search.trim()} ».`
                : filter === "all"
                  ? "Votre Daara n'a pas encore lancé d'appel. Vous serez prévenu dès qu'un Ndiguel s'ouvre."
                  : `Aucun Ndiguel « ${filterLabel} » à ce jour. Essayez « Tous ».`
            }
            card={false}
            style={styles.empty}
          />
        ) : (
          visible.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              showsAmount={showsAmounts}
              onPress={() => router.push(`/campaign/${campaign.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CampaignRow({
  campaign,
  showsAmount,
  onPress,
}: {
  campaign: Campaign;
  showsAmount: boolean;
  onPress: () => void;
}) {
  const state = STATUS[campaign.status];
  /*
    `formatCountdown` rend « Clôturé » sur une échéance passée — ce que la
    ligne de statut dit déjà. La capture du 2026-09-04 affichait
    « Clôturé » deux fois. On ne compte les jours que tant qu'il y en a.
  */
  const countdown =
    campaign.status === "active" || campaign.status === "pending"
      ? formatCountdown(campaign.deadline)
      : null;
  /*
    🔴 La méta portait `campaign.daara_name` — « KANDE · J-55 » — ce qui se
    lit comme le Daara PROPRIÉTAIRE du Ndiguel. Il ne l'est pas : `daara` est
    un ciblage facultatif, et un Ndiguel s'adresse à la confrérie.

    La fête prend sa place. C'est le contexte réel d'un Ndiguel — « KAZU
    RAJAB · J-55 » situe l'appel, là où un nom de Daara égarait. La fiche de
    détail l'affiche déjà en sur-titre : les deux écrans disent enfin la même
    chose de la même campagne.
  */
  const meta = [campaign.event_name, countdown].filter(Boolean).join(" · ");

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={campaign.name}
      padded={false}
      style={styles.row}
    >
      {/*
        `campaignVisual` rend l'image du Ndiguel, ou à défaut une photographie
        authentique choisie de façon stable sur l'identifiant. Voir le module
        pour ce que ce pis-aller implique.
      */}
      <ExpoImage
        source={campaignVisual(campaign, "square")}
        style={styles.thumb}
        contentFit="cover"
        transition={140}
      />

      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {campaign.name}
        </Text>
        {meta ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <Text style={[styles.rowStatus, { color: state.tone }]}>{state.label}</Text>
        {showsAmount && campaign.collected_amount > 0 ? (
          <Text style={styles.rowAmount} selectable>
            {formatFCFA(campaign.collected_amount)}
          </Text>
        ) : null}
      </View>

      <ChevronRight size={20} color={Ink[300]} strokeWidth={1.5} />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.alt },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
  },
  title: { ...Type.screenTitle, color: Violet[900], flex: 1 },
  search: { paddingHorizontal: GUTTER, marginTop: Space.md, marginBottom: 0 },

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    paddingHorizontal: GUTTER,
    paddingVertical: Space.lg,
  },

  list: { paddingHorizontal: GUTTER, gap: Space.md },
  empty: { marginTop: 64 },

  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Violet[100],
  },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { ...UIType.rowTitle, color: Ink[900] },
  rowMeta: { ...Type.label, color: Ink[500] },
  rowStatus: { fontFamily: Font.bold, fontSize: 12, lineHeight: 16 },
  rowAmount: {
    fontFamily: Font.bold,
    fontSize: 13,
    lineHeight: 17,
    color: montant,
    fontVariant: ["tabular-nums"],
  },
});
