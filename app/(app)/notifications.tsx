/**
 * app/(app)/notifications.tsx — les notifications, passées au système, et
 * branchées sur leurs vraies données (phase F).
 *
 * ── 🔴 L'écran ne montrait aucune notification ──────────────────────────────
 *
 * Il appelait `getAnnouncements()` et rendait la même liste **deux fois** :
 * « Prioritaires » (les annonces dont l'urgence n'est pas `info`) puis
 * « Dernières notifications » (les six plus récentes, urgentes comprises). Une
 * annonce critique apparaissait donc en double, à quelques centimètres d'écart.
 *
 * Pendant ce temps, `GET /comms/notifications/` existait et **n'a jamais été
 * appelé**. C'est pourtant exactement ce que la notification poussée dépose :
 * `comms/signals.py:109` envoie le push à la création d'un `Notification`. Un
 * membre qui tapait sur la bannière Android arrivait donc sur un écran qui ne
 * contenait pas ce qu'il venait de lire.
 *
 * L'écran lit maintenant `Notification`. Les annonces ont leur propre écran —
 * `/announcements`, renommé « Annonces » dans le même lot — et un lien y mène
 * en bas de liste.
 *
 * ── Ce qu'on peut faire, et ce qu'on ne peut pas ────────────────────────────
 *
 * `NotificationViewSet` n'accepte que `get` et `patch` (`comms/views.py:472`).
 * On peut donc **marquer lu**, et rien d'autre : pas de suppression, pas de
 * « tout marquer comme lu » en un appel — ce dernier se fait en `PATCH`
 * successifs, ce que l'écran assume plutôt que de le simuler localement.
 *
 * Le sérialiseur ne porte **ni type, ni cible, ni lien** (cinq champs :
 * `id`, `title`, `message`, `is_read`, `created_at`). Une notification n'est
 * donc **pas cliquable vers l'objet qu'elle annonce** : deviner la destination
 * à partir du titre produirait une navigation fausse une fois sur trois.
 *
 * ── Les « accès rapides » retirés ───────────────────────────────────────────
 *
 * Deux tuiles « Profil » et « Ndiguels » en bas d'écran, qui doublonnaient la
 * barre d'onglets et le tiroir. Elles occupaient la place sans rien ajouter.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BellOff, ChevronRight, Megaphone } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dot } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import type { AppNotification } from "@/types/content.types";
import {
  Border,
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
} from "@/theme";

/** « Il y a 3 h ». Au-delà d'une semaine, la date parle mieux que le compte. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

interface State {
  status: "loading" | "ready" | "failed";
  items: AppNotification[];
}

async function fetchNotifications(): Promise<State> {
  try {
    return { status: "ready", items: await ContentService.getNotifications() };
  } catch {
    return { status: "failed", items: [] };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", items: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNotifications().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchNotifications().then(setState);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications()
      .then(setState)
      .finally(() => setRefreshing(false));
  }, []);

  const unread = useMemo(() => state.items.filter((item) => !item.is_read), [state.items]);

  /**
   * Marquer lu au toucher. L'écran **n'anticipe pas** : la ligne ne change
   * qu'après la réponse du serveur. Un `PATCH` refusé laisserait sinon une
   * notification qui se croit lue et ne redescendrait plus jamais.
   */
  const markRead = useCallback(async (id: number) => {
    try {
      const updated = await ContentService.markNotificationRead(id);
      setState((previous) => ({
        ...previous,
        items: previous.items.map((item) => (item.id === id ? updated : item)),
      }));
    } catch {
      // Le serveur a refusé : la ligne reste non lue, ce qui est la vérité.
    }
  }, []);

  /**
   * Pas de point d'API « tout marquer lu » : c'est une suite de `PATCH`. On les
   * lance ensemble et on ne garde que ce qui a réellement abouti.
   */
  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    const results = await Promise.allSettled(
      unread.map((item) => ContentService.markNotificationRead(item.id)),
    );
    const updated = new Map<number, AppNotification>();
    for (const result of results) {
      if (result.status === "fulfilled") updated.set(result.value.id, result.value);
    }
    setState((previous) => ({
      ...previous,
      items: previous.items.map((item) => updated.get(item.id) ?? item),
    }));
    setMarkingAll(false);
  }, [unread]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Notifications" onBack={() => router.back()} />

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
        {unread.length > 0 ? (
          <View style={styles.unreadBar}>
            <Text style={styles.unreadCount}>
              {unread.length === 1 ? "1 non lue" : `${unread.length} non lues`}
            </Text>
            <Button
              label="Tout marquer comme lu"
              variant="ghost"
              size="md"
              fullWidth={false}
              loading={markingAll}
              onPress={markAllRead}
            />
          </View>
        ) : null}

        {state.status === "loading" ? (
          <View style={styles.list}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : null}

        {state.status === "failed" ? (
          <ErrorState body="Vos notifications n'ont pas pu être chargées." onRetry={reload} />
        ) : null}

        {state.status === "ready" && state.items.length === 0 ? (
          <EmptyState
            picto={<BellOff size={56} color={Violet[900]} strokeWidth={1.25} />}
            title="Aucune notification"
            body="Les rappels de Ndiguel, les changements de date et les annonces critiques arriveront ici."
          />
        ) : null}

        {state.items.length > 0 ? (
          <View style={styles.list}>
            {state.items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onPress={item.is_read ? undefined : () => markRead(item.id)}
              />
            ))}
          </View>
        ) : null}

        {/* Les annonces ne sont plus mélangées aux notifications — elles ont leur écran. */}
        <Pressable
          onPress={() => router.push("/announcements")}
          accessibilityRole="button"
          accessibilityLabel="Voir les annonces du Daara"
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <View style={styles.linkIcon}>
            <Megaphone size={18} color={Violet[900]} strokeWidth={1.5} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkTitle}>Annonces du Daara</Text>
            <Text style={styles.linkBody}>Les messages publiés par votre chef de Daara</Text>
          </View>
          <ChevronRight size={18} color={Ink[300]} strokeWidth={1.5} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress?: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={
        onPress ? `${item.title} — marquer comme lue` : item.title
      }
      style={[styles.card, item.is_read && styles.cardRead]}
    >
      <View style={styles.cardHeader}>
        {!item.is_read ? <Dot color={Status.error} size={8} style={styles.dot} /> : null}
        <Text style={[styles.cardTitle, item.is_read && styles.titleRead]}>{item.title}</Text>
        <Text style={styles.cardTime}>{relativeTime(item.created_at)}</Text>
      </View>
      <Text style={styles.cardBody}>{item.message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: 120,
    gap: Space.lg,
  },
  list: { gap: Space.md },

  unreadBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },
  unreadCount: { ...UIType.chipLabel, color: Ink[500] },

  card: { gap: Space.sm },
  /** La lue perd son filet et passe sur le fond de section : elle recule. */
  cardRead: { backgroundColor: Surface.alt, borderColor: "transparent" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  dot: { marginRight: 2 },
  cardTitle: { ...UIType.rowTitle, color: Ink[900], flex: 1 },
  titleRead: { color: Ink[500] },
  cardTime: { ...Type.micro, color: Ink[300] },
  cardBody: { ...Type.body, color: Ink[500] },

  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.lg,
    borderRadius: Radius.card,
    ...continuous,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: { flex: 1, gap: 2 },
  linkTitle: { ...UIType.rowTitle, color: Ink[900] },
  linkBody: { ...Type.label, color: Ink[500] },
  pressed: { opacity: 0.72 },
});
