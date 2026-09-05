/**
 * app/(app)/announcements.tsx — les annonces, passées au système (phase F).
 *
 * Écran hérité (§5.2). Quatre corrections en chemin.
 *
 * ── 🔴 Deux écrans s'appelaient « Actualités » ──────────────────────────────
 *
 * Celui-ci et `explore.tsx`. Ils ne montrent pourtant pas la même chose :
 * `explore` sert `NewsPost` — le journal de la confrérie, rédigé, illustré ;
 * celui-ci sert `Announcement` (`comms/models.py`) — le message court d'un chef
 * de Daara à ses membres, avec une urgence et une échéance.
 *
 * Un membre arrivant par le bandeau épinglé d'une conversation lisait
 * « Actualités » et cherchait le journal. **Cet écran s'appelle désormais
 * « Annonces »** — c'est le mot du modèle, et c'est celui que le chef emploie.
 *
 * ── L'échéance passée n'était pas signalée ──────────────────────────────────
 *
 * `AnnouncementViewSet.get_queryset` (`comms/views.py:521`) filtre sur
 * `is_published`, le rôle et le Daara — **jamais sur `expires_at`**. Une annonce
 * « réunion samedi » restait donc en tête de liste des mois plus tard, avec sa
 * date d'expiration écrite en gris au même titre que le reste.
 *
 * Elle n'est pas masquée — un chef doit pouvoir relire ce qu'il a publié — mais
 * elle porte sa mention « Échue » et passe derrière les annonces vivantes.
 *
 * ── La carte qui ne disait rien ─────────────────────────────────────────────
 *
 * Un bandeau « Les actualités au même endroit. Vous retrouvez ici l'ensemble
 * des actualités publiées par la communauté, triés par fraîcheur… » occupait le
 * premier écran pour décrire une liste qui se voit. Retiré.
 *
 * ── La pastille « Publié » ──────────────────────────────────────────────────
 *
 * Posée sur chaque carte, alors que la liste est filtrée sur `is_published` :
 * elle portait toujours la même valeur. Remplacée par l'urgence, qui, elle,
 * distingue les cartes entre elles.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Megaphone } from "lucide-react-native";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import type { Announcement, Urgency } from "@/types/content.types";
import {
  Border,
  GUTTER,
  Ink,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

type Filter = "all" | Urgency;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "Toutes", value: "all" },
  { label: "Info", value: "info" },
  { label: "À suivre", value: "warning" },
  { label: "Critiques", value: "critical" },
];

const URGENCY: Record<Urgency, { label: string; tone: BadgeTone }> = {
  info: { label: "Info", tone: "closed" },
  warning: { label: "À suivre", tone: "upcoming" },
  critical: { label: "Critique", tone: "dark" },
};

const AUDIENCE: Record<Announcement["target_role"], string> = {
  all: "Tous les membres",
  member: "Talibés",
  chef_daara: "Chefs de Daara",
  collector: "Collecteurs",
  admin: "Administrateurs",
};

function isExpired(item: Announcement): boolean {
  if (!item.expires_at) return false;
  const at = new Date(item.expires_at).getTime();
  return !Number.isNaN(at) && at < Date.now();
}

function formatDate(raw?: string | null) {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface State {
  status: "loading" | "ready" | "failed";
  items: Announcement[];
}

async function fetchAnnouncements(): Promise<State> {
  try {
    const data = await ContentService.getAnnouncements();
    /**
     * Le serveur filtre déjà `is_published` pour un membre ; un administrateur,
     * lui, reçoit AUSSI les brouillons. Le filtre est donc conservé côté client :
     * cet écran est celui du membre, pas la console de rédaction.
     */
    return { status: "ready", items: data.filter((item) => item.is_published) };
  } catch {
    return { status: "failed", items: [] };
  }
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", items: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    fetchAnnouncements().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchAnnouncements().then(setState);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements()
      .then(setState)
      .finally(() => setRefreshing(false));
  }, []);

  /** Les annonces vivantes d'abord, les échues ensuite ; chacune par fraîcheur. */
  const visible = useMemo(() => {
    const kept =
      filter === "all" ? state.items : state.items.filter((item) => item.urgency === filter);

    return [...kept].sort((a, b) => {
      const expiry = Number(isExpired(a)) - Number(isExpired(b));
      if (expiry !== 0) return expiry;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filter, state.items]);

  const counts = useMemo(() => {
    const map = { all: state.items.length, info: 0, warning: 0, critical: 0 };
    for (const item of state.items) map[item.urgency] += 1;
    return map;
  }, [state.items]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Annonces" onBack={() => router.back()} />

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
          <ErrorState body="Les annonces n'ont pas pu être chargées." onRetry={reload} />
        ) : null}

        {state.status === "ready" && visible.length === 0 ? (
          <EmptyState
            picto={<Megaphone size={56} color={Violet[900]} strokeWidth={1.25} />}
            title={filter === "all" ? "Aucune annonce" : "Aucune annonce dans ce filtre"}
            body={
              filter === "all"
                ? "Les messages de votre Daara apparaîtront ici."
                : "Essayez « Toutes » pour voir l'ensemble des annonces."
            }
            actionLabel={filter === "all" ? undefined : "Tout afficher"}
            onAction={filter === "all" ? undefined : () => setFilter("all")}
          />
        ) : null}

        <View style={styles.list}>
          {visible.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const expired = isExpired(item);
  const urgency = URGENCY[item.urgency];

  return (
    <Card style={[styles.card, expired && styles.cardExpired]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Megaphone size={18} color={Violet[900]} strokeWidth={1.5} />
        </View>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {formatDate(item.created_at)}
            {item.daara_name ? ` · ${item.daara_name}` : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.cardBody}>{item.content}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.badges}>
          <Badge label={urgency.label} tone={urgency.tone} />
          {expired ? <Badge label="Échue" tone="closed" /> : null}
        </View>
        <Text style={styles.audience}>
          {AUDIENCE[item.target_role] ?? item.target_role}
        </Text>
      </View>

      {item.expires_at ? (
        <Text style={styles.expiry}>
          {expired
            ? `Échue le ${formatDate(item.expires_at)}`
            : `Valable jusqu'au ${formatDate(item.expires_at)}`}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: { paddingTop: Space.sm, paddingBottom: 120, gap: Space.lg },
  filters: { paddingHorizontal: GUTTER },
  list: { paddingHorizontal: GUTTER, gap: Space.md },

  card: { gap: Space.md },
  /** L'échue reste lisible : on la retire du premier plan, pas de la vue. */
  cardExpired: { backgroundColor: Surface.alt, borderColor: "transparent" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeading: { flex: 1, gap: 2 },
  cardTitle: { ...Type.cardTitle, color: Ink[900] },
  cardMeta: { ...Type.micro, color: Ink[300] },
  cardBody: { ...Type.body, color: Ink[500] },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Border.hairline,
    paddingTop: Space.md,
  },
  badges: { flexDirection: "row", gap: Space.sm },
  audience: { ...UIType.badgeLabel, color: Ink[300] },
  expiry: { ...Type.micro, color: Ink[300] },
});
