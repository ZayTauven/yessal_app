/**
 * app/(app)/(tabs)/chat.tsx — la liste des conversations.
 *
 * Planche « Accueil et Onglets », vues `messagesFull` et `messagesEmpty` :
 * en-tête (tiroir · titre), puis des rangées séparées d'un filet — avatar, nom,
 * dernier message, heure, pastille de non-lus. Rien d'autre.
 *
 * ── Ce qui a disparu de l'ancien écran ──────────────────────────────────────
 *
 * — **Le calcul du dernier message côté client.** L'écran téléchargeait TOUS
 *   les messages de TOUTES les conversations (`getMessages()`), les triait, et
 *   n'en gardait qu'un par fil. Le serveur compose déjà ce condensé :
 *   `ChatSerializer.get_last_message`, en un seul sous-requêtage annoté. Un
 *   appel au lieu de deux, et une charge qui ne grandit plus avec l'historique ;
 * — **la pastille de non-lus câblée à `unread: 0`.** Elle était donc invisible
 *   par construction. `unread_count` existe côté serveur depuis le début, et
 *   personne ne le lisait — voir `normalizeChat` ;
 * — **les deux sections « Mon Daara » / « Discussions ».** La planche pose une
 *   liste unique, triée par récence. C'est la convention de toute messagerie :
 *   ce qui vient d'arriver est en haut ;
 * — **le bandeau d'administration** (« Vous gérez toutes les discussions ») et
 *   **la pastille « Admin » sur chaque ligne**. Rappeler son propre rôle à
 *   chaque ligne d'une liste n'apprend rien à celui qui le porte ;
 * — **le bouton « Nouveau groupe »**, qui ouvrait une alerte renvoyant au
 *   tableau de bord web. Un bouton dont la seule action est de dire qu'il ne
 *   fait rien ;
 * — **la recherche.** La planche des Ndiguels dessine une loupe, celle des
 *   Messages n'en dessine pas : un talibé a le salon de son Daara et quelques
 *   échanges, filtrer une liste qu'on voit entière n'a pas d'objet.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessagesSquare, Menu } from "lucide-react-native";

import { ChatRow } from "@/components/chat/ChatRow";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/Button";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { TAB_BAR_SPACE } from "@/components/navigation/TabBar";
import { ContentService } from "@/lib/content.service";
import { useUiStore } from "@/store/ui.store";
import type { Chat } from "@/types/content.types";
import { GUTTER, Ink, Space, Surface, Type, Violet } from "@/theme";

interface ListState {
  status: "loading" | "ready" | "failed";
  chats: Chat[];
}

/**
 * Le tri : la conversation qui a bougé en dernier passe devant. Celles qui
 * n'ont aucun message ferment la liste — elles n'ont pas d'horodatage à
 * comparer, et les mettre en tête donnerait la première place au silence.
 */
function byRecency(a: Chat, b: Chat): number {
  const at = a.last_message?.sent_at ? new Date(a.last_message.sent_at).getTime() : 0;
  const bt = b.last_message?.sent_at ? new Date(b.last_message.sent_at).getTime() : 0;
  return bt - at;
}

/**
 * Rend un état COMPLET. Le `setState` vit après l'`await`, jamais dans le corps
 * de l'effet — c'est ce que `react-hooks/set-state-in-effect` exige, et c'est
 * le même montage que `fetchDetail` dans `campaign/[id].tsx`.
 */
async function fetchChats(): Promise<ListState> {
  try {
    const chats = await ContentService.getChats();
    return { status: "ready", chats: [...chats].sort(byRecency) };
  } catch {
    return { status: "failed", chats: [] };
  }
}

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openDrawer = useUiStore((state) => state.openDrawer);

  const [state, setState] = useState<ListState>({ status: "loading", chats: [] });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchChats().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setState(await fetchChats());
    setRefreshing(false);
  }, []);

  const { status, chats } = state;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton
          icon={<Menu size={20} color={Ink[900]} strokeWidth={1.6} />}
          onPress={openDrawer}
          accessibilityLabel="Ouvrir le menu"
        />
        <Text style={styles.title}>Messages</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + TAB_BAR_SPACE + Space.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Violet[500]} />
        }
      >
        {status === "loading" ? (
          <>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </>
        ) : status === "failed" ? (
          <ErrorState
            body="Vos conversations n'ont pas pu être chargées."
            onRetry={refresh}
            style={styles.state}
          />
        ) : chats.length === 0 ? (
          /*
            ⚠ Le corps disait « les annonces publiques restent dans l'onglet
            Accueil ». C'ÉTAIT FAUX : l'Accueil sert `getNews()`, c'est-à-dire
            des `NewsPost` — des articles — et n'affiche aucun `Announcement`.
            Un membre suivait donc l'indication et ne trouvait rien.

            Pire, la phrase était PORTEUSE : `PinnedAnnouncement` écarte les
            annonces globales du bandeau épinglé en s'appuyant dessus. Entre les
            deux, une annonce globale n'était joignable par AUCUN chemin.

            Elle renvoie maintenant là où les annonces vivent réellement.
          */
          <EmptyState
            picto={<MessagesSquare size={56} color={Violet[900]} strokeWidth={1.5} />}
            title="Aucun message"
            body="Le chef de votre Daara vous écrira ici. Les annonces publiées se lisent à part."
            actionLabel="Voir les annonces"
            onAction={() => router.push("/announcements")}
            card={false}
            style={styles.state}
          />
        ) : (
          chats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              onPress={() => router.push(`/chat/${chat.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: Space.lg,
  },
  /*
    `Type.screenTitle` vaut 32 là où la planche des Messages écrit 28. C'est le
    cran retenu pour tous les titres d'onglet depuis la liste des Ndiguels : un
    titre qui change de taille d'un onglet à l'autre se remarque plus qu'un
    écart de quatre points avec la maquette.
  */
  title: { ...Type.screenTitle, color: Violet[900], flex: 1 },

  list: { paddingHorizontal: GUTTER },
  state: { marginTop: 72 },
});
