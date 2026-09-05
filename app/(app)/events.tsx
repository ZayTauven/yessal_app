/**
 * app/(app)/events.tsx — le calendrier des fêtes, passé au système (phase F).
 *
 * Écran hérité (§5.2) : tokens et composants, pas de refonte. Mais trois choses
 * ont dû partir, parce qu'elles ne pouvaient pas être vraies.
 *
 * ── 🔴 Les trois fêtes inventées ────────────────────────────────────────────
 *
 * `FALLBACK_FETES` posait « Grand Magal de Touba », « Gamou » et « Dahira
 * hebdomadaire » **en dur**, affichés dès que l'appel échouait ou rendait une
 * liste vide. Un bandeau disait « mode hors-ligne », ce qui était déjà mieux
 * que rien — mais les cartes, elles, étaient indiscernables de vraies fêtes.
 *
 * Et elles portaient `id: 1`, `2`, `3`. Le bouton « Voir le détail » poussait
 * donc `/event/1` : le membre atterrissait sur le **tableau de bord d'une
 * autre fête**, celle qui porte réellement l'identifiant 1 en base, avec ses
 * montants et ses contributeurs. Un mensonge qui ouvre les chiffres de
 * quelqu'un d'autre.
 *
 * Remplacé par `ErrorState` et `EmptyState` : on dit qu'on n'a pas pu charger,
 * et on propose de réessayer.
 *
 * ── La photographie de couverture qui n'existait pas ────────────────────────
 *
 * L'écran réservait 140 px à `fete.cover_image`. Le modèle `Fete`
 * (`events/models.py:8`) **n'a aucun champ image** — voir le commentaire de
 * `EventItem`. Le bloc est retiré, pas masqué.
 *
 * ── `is_active` ─────────────────────────────────────────────────────────────
 *
 * Le seul champ réel qui manquait. Une fête retirée du calendrier s'affichait
 * comme les autres ; elle porte maintenant sa mention.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Calendar,
  CalendarDays,
  ChevronRight,
  RefreshCw,
  Repeat,
  Star,
} from "lucide-react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import type { EventItem } from "@/types/content.types";
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
} from "@/theme";

function formatDate(date?: string | null) {
  if (!date) return "Date à confirmer";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Dans les trente jours. Au-delà, « bientôt » ne veut plus rien dire. */
function isUpcoming(date?: string | null): boolean {
  if (!date) return false;
  const parsed = new Date(date).getTime();
  if (Number.isNaN(parsed)) return false;
  const delta = parsed - Date.now();
  return delta > 0 && delta < 30 * 24 * 60 * 60 * 1000;
}

const RECURRENCE_LABELS: Record<EventItem["recurrence"], string> = {
  annual: "Annuelle",
  quarterly: "Trimestrielle",
  weekly: "Hebdomadaire",
  none: "Ponctuelle",
};

function RecurrenceIcon({ value }: { value: EventItem["recurrence"] }) {
  if (value === "weekly") return <Repeat size={12} color={Violet[700]} strokeWidth={1.5} />;
  if (value === "annual") return <RefreshCw size={12} color={Violet[700]} strokeWidth={1.5} />;
  return <Star size={12} color={Violet[700]} strokeWidth={1.5} />;
}

interface State {
  status: "loading" | "ready" | "failed";
  fetes: EventItem[];
}

async function fetchFetes(): Promise<State> {
  try {
    return { status: "ready", fetes: await ContentService.getEvents() };
  } catch {
    return { status: "failed", fetes: [] };
  }
}

export default function FetesScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", fetes: [] });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchFetes().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchFetes().then(setState);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchFetes()
      .then(setState)
      .finally(() => setRefreshing(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Fêtes"
        onBack={() => router.back()}
        right={{
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
        <Text style={styles.lead}>
          Les fêtes portent les Ndiguels. Quand une date est arrêtée, une
          notification vous parvient.
        </Text>

        {state.status === "loading" ? (
          <View style={styles.list}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : null}

        {state.status === "failed" ? (
          <ErrorState
            body="Le calendrier des fêtes n'a pas pu être chargé."
            onRetry={reload}
          />
        ) : null}

        {state.status === "ready" && state.fetes.length === 0 ? (
          <EmptyState
            picto={<CalendarDays size={56} color={Violet[900]} strokeWidth={1.25} />}
            title="Aucune fête au calendrier"
            body="Les fêtes sont créées par l'administration. Celles de votre Daara apparaîtront ici."
          />
        ) : null}

        {state.status === "ready" && state.fetes.length > 0 ? (
          <View style={styles.list}>
            {state.fetes.map((fete, index) => (
              <FeteRow
                key={fete.id}
                fete={fete}
                last={index === state.fetes.length - 1}
                onPress={() => router.push(`/event/${fete.id}`)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeteRow({
  fete,
  last,
  onPress,
}: {
  fete: EventItem;
  last: boolean;
  onPress: () => void;
}) {
  const upcoming = isUpcoming(fete.event_date);

  return (
    <View style={styles.timelineItem}>
      <View style={styles.connector}>
        <View style={[styles.dot, upcoming && styles.dotUpcoming]} />
        {!last ? <View style={styles.line} /> : null}
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.recurrence}>
            <RecurrenceIcon value={fete.recurrence} />
            <Text style={styles.recurrenceText}>{RECURRENCE_LABELS[fete.recurrence]}</Text>
          </View>
          {upcoming ? <Badge label="Bientôt" tone="active" /> : null}
          {!fete.is_active ? <Badge label="Retirée" tone="closed" /> : null}
        </View>

        <Text style={styles.name}>{fete.name}</Text>

        <View style={styles.dateRow}>
          <Calendar size={14} color={upcoming ? Violet[700] : Ink[300]} strokeWidth={1.5} />
          <Text style={[styles.dateText, upcoming && styles.dateUpcoming]}>
            {formatDate(fete.event_date)}
          </Text>
        </View>

        {fete.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {fete.description}
          </Text>
        ) : null}

        <Pressable
          onPress={onPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Voir le détail de ${fete.name}`}
          style={({ pressed }) => [styles.detailLink, pressed && styles.pressed]}
        >
          <Text style={styles.detailText}>Voir le détail</Text>
          <ChevronRight size={16} color={Violet[700]} strokeWidth={1.5} />
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: 120,
    gap: Space.xl,
  },
  lead: { ...Type.body, color: Ink[500] },
  list: { gap: Space.md },

  timelineItem: { flexDirection: "row", gap: Space.md },
  connector: { width: 12, alignItems: "center", paddingTop: Space.xl },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.chip,
    backgroundColor: Ink[100],
  },
  dotUpcoming: { backgroundColor: Violet[300] },
  line: { flex: 1, width: 1, backgroundColor: Border.hairline, marginTop: Space.xs },

  card: { flex: 1, gap: Space.sm },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  recurrence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.chip,
    backgroundColor: Violet[100],
  },
  recurrenceText: { ...UIType.badgeLabel, color: Violet[900] },
  name: { ...Type.cardTitle, color: Ink[900] },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { ...Type.label, color: Ink[500] },
  dateUpcoming: { color: Violet[700] },
  description: { ...Type.body, color: Ink[500] },
  detailLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    alignSelf: "flex-start",
    marginTop: Space.xs,
    paddingVertical: Space.xs,
  },
  detailText: { ...UIType.chipLabel, color: Violet[700] },
  pressed: { opacity: 0.72 },
});
