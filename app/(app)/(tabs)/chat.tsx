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
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, MessagesSquare, Menu, SquarePen, X } from "lucide-react-native";

import { ChatRow } from "@/components/chat/ChatRow";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/Button";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { TAB_BAR_SPACE } from "@/components/navigation/TabBar";
import { ContentService } from "@/lib/content.service";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import type { Chat, ChatInvitation } from "@/types/content.types";
import { GUTTER, HIT, Ink, Space, Surface, Type, UIType, Violet } from "@/theme";

interface ListState {
  status: "loading" | "ready" | "failed";
  chats: Chat[];
  /**
   * Les demandes de conversation REÇUES et encore en attente.
   *
   * Sans elles, tout le parcours d'ouverture d'un fil se termine dans le vide :
   * un membre envoie sa demande, le destinataire ne la voit nulle part, et le
   * `Chat` direct — qui ne naît QUE de l'acceptation — n'existe jamais. La
   * notification en parle, mais une notification se lit une fois et se perd.
   */
  invitations: ChatInvitation[];
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
async function fetchChats(userId?: number): Promise<ListState> {
  try {
    /*
      Les deux appels partent ensemble. L'échec des INVITATIONS n'est pas
      fatal — on peut lire ses conversations sans elles ; celui des
      conversations l'est.
    */
    const [chats, invitations] = await Promise.all([
      ContentService.getChats(),
      ContentService.getInvitations().catch(() => [] as ChatInvitation[]),
    ]);
    return {
      status: "ready",
      chats: [...chats].sort(byRecency),
      /*
        On ne garde QUE ce qui appelle une réponse de cet utilisateur : reçues,
        et en attente. Ses propres demandes envoyées n'ont pas leur place en
        tête de liste — il n'y a rien à y faire, et elles disparaîtront d'elles
        mêmes en devenant des conversations.
      */
      invitations: invitations.filter(
        (i) => i.status === "pending" && i.recipient?.id === userId,
      ),
    };
  } catch {
    return { status: "failed", chats: [], invitations: [] };
  }
}

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openDrawer = useUiStore((state) => state.openDrawer);

  const userId = useAuthStore((s) => s.user?.id);

  const [state, setState] = useState<ListState>({
    status: "loading",
    chats: [],
    invitations: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [answering, setAnswering] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchChats(userId).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setState(await fetchChats(userId));
    setRefreshing(false);
  }, [userId]);

  /*
    Accepter ouvre le fil et y mène directement : c'est le geste qu'on venait
    faire. Refuser recharge la liste — l'invitation disparaît, sans confirmation
    supplémentaire. Un refus se reprend en redemandant, ce n'est pas destructif.
  */
  const answer = useCallback(
    async (invitation: ChatInvitation, accept: boolean) => {
      setAnswering(invitation.id);
      try {
        if (accept) {
          const chat = await ContentService.acceptInvitation(invitation.id);
          router.push(`/chat/${chat.id}`);
        } else {
          await ContentService.declineInvitation(invitation.id);
        }
        setState(await fetchChats(userId));
      } catch {
        Alert.alert(
          "Réponse non enregistrée",
          "La demande a peut-être déjà reçu une réponse. Tirez pour rafraîchir.",
        );
      } finally {
        setAnswering(null);
      }
    },
    [router, userId],
  );

  const { status, chats, invitations } = state;

  /*
    La racine est un `SafeAreaView edges={["top"]}`, et non un `View` nu. Même
    correction qu'à l'accueil et aux Ndiguels : seul `profile.tsx` était
    enveloppé, et les trois autres onglets collaient leur titre à la barre
    d'état. Voir le commentaire de `campaigns.tsx` pour le détail — et pour la
    raison de ne pas le retirer (Android est en `edge-to-edge`).
  */
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <IconButton
          icon={<Menu size={20} color={Ink[900]} strokeWidth={1.6} />}
          onPress={openDrawer}
          accessibilityLabel="Ouvrir le menu"
        />
        <Text style={styles.title}>Messages</Text>
        {/*
          Le bouton qui manquait. L'ancien écran avait un « Nouveau groupe » qui
          ouvrait une alerte renvoyant au tableau de bord — un bouton dont la
          seule action était de dire qu'il ne faisait rien. Celui-ci mène à un
          écran qui ouvre réellement une conversation.
        */}
        <IconButton
          icon={<SquarePen size={19} color={Ink[900]} strokeWidth={1.6} />}
          onPress={() => router.push("/chat/new")}
          accessibilityLabel="Nouvelle conversation"
        />
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
        {invitations.length > 0 ? (
          <View style={styles.invites}>
            <Text style={styles.invitesTitle}>
              {invitations.length === 1
                ? "Une demande de conversation"
                : `${invitations.length} demandes de conversation`}
            </Text>
            {invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                busy={answering === invitation.id}
                disabled={answering !== null}
                onAnswer={(accept) => answer(invitation, accept)}
              />
            ))}
          </View>
        ) : null}

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
          /*
            ⚠ Le corps disait aussi « le chef de votre Daara vous écrira ici »,
            ce qui décrivait fidèlement l'impuissance de l'écran : il n'y avait
            AUCUN moyen d'ouvrir un fil depuis le téléphone. Maintenant qu'il y
            en a un, l'état vide propose le geste au lieu de faire attendre.
          */
          <EmptyState
            picto={<MessagesSquare size={56} color={Violet[900]} strokeWidth={1.5} />}
            title="Aucun message"
            body="Écrivez à un membre de votre Daara, ou ouvrez un salon. Les annonces publiées se lisent à part."
            actionLabel="Nouvelle conversation"
            onAction={() => router.push("/chat/new")}
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
    </SafeAreaView>
  );
}

/**
 * Une demande reçue, avec ses deux réponses.
 *
 * ⚠ Les deux boutons sont des FRÈRES de la ligne, pas des enfants d'une ligne
 * pressable : une cible tactile imbriquée dans une autre rend la plus petite
 * inatteignable sur Android — et sur Expo Web c'est un `<button>` dans un
 * `<button>`, HTML invalide. Même règle que la carte du rail de l'accueil.
 */
function InvitationRow({
  invitation,
  busy,
  disabled,
  onAnswer,
}: {
  invitation: ChatInvitation;
  busy: boolean;
  disabled: boolean;
  onAnswer: (accept: boolean) => void;
}) {
  /* Même contrat que la recherche : `UserBriefSerializer` sert `name`, déjà
     composé et déjà replié sur l'adresse ou le numéro. */
  const sender = invitation.sender;
  const name = sender?.name?.trim() || "Un membre";

  return (
    <View style={styles.invite}>
      <Avatar uri={sender?.avatar} name={name} size={40} />
      <View style={styles.inviteText}>
        <Text style={styles.inviteName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.inviteMeta} numberOfLines={1}>
          souhaite vous écrire
        </Text>
      </View>
      <View style={styles.inviteActions}>
        <Pressable
          onPress={() => onAnswer(false)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Refuser la demande de ${name}`}
          style={({ pressed }) => [styles.inviteBtn, pressed && styles.invitePressed]}
        >
          <X size={18} color={Ink[500]} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          onPress={() => onAnswer(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Accepter la demande de ${name}`}
          style={({ pressed }) => [
            styles.inviteBtn,
            styles.inviteAccept,
            pressed && styles.invitePressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={Violet[900]} />
          ) : (
            <Check size={18} color={Violet[900]} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },

  invites: { gap: Space.xs, paddingBottom: Space.lg },
  invitesTitle: {
    ...Type.label,
    color: Ink[500],
    textTransform: "uppercase",
    paddingBottom: Space.xs,
  },
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    backgroundColor: Violet[100],
    borderRadius: 14,
  },
  inviteText: { flex: 1, gap: 2 },
  inviteName: { ...UIType.rowTitle, color: Violet[900] },
  inviteMeta: { ...Type.micro, color: Ink[500] },
  inviteActions: { flexDirection: "row", gap: Space.xs },
  inviteBtn: {
    width: HIT,
    height: HIT,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Surface.default,
  },
  inviteAccept: { backgroundColor: Violet[300] },
  invitePressed: { opacity: 0.6 },

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
