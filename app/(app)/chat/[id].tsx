/**
 * app/(app)/chat/[id].tsx — une conversation. DEUX VARIANTES, UNE SEULE ROUTE.
 *
 * Planche « Accueil et Onglets », vues `isChat` et `isGroupe`. Ce qui les
 * sépare tient en quatre points, et `chat_type` suffit à les trancher :
 *
 *   tête-à-tête   avatar + nom + rôle de l'autre · bulles nues · « Écrire un message… »
 *   groupe        pile de visages + effectif · annonce épinglée · bulles signées
 *                 et portant le visage de leur auteur · « Message au Daara… »
 *
 * Deux fichiers auraient dupliqué l'en-tête, le fil, le composeur et le
 * chargement pour quatre différences d'affichage.
 *
 * ── Ce que la planche promet et que le backend ne sait pas dire ─────────────
 *
 * — **« en ligne »** (tête-à-tête) et **« 3 en train d'écrire »** (groupe).
 *   `comms/` n'expose ni présence ni indicateur de frappe : `UserBriefSerializer`
 *   ne porte aucun de ces champs, et le canal Pusher ne diffuse que les
 *   messages, les réactions et les invitations (`comms/signals.py`). Inventer
 *   « en ligne » ferait attendre une réponse immédiate d'un chef de Daara qui
 *   n'a pas ouvert l'application depuis trois jours. Le sous-titre dit donc ce
 *   qui est VRAI : le rôle de l'interlocuteur, l'effectif du salon ;
 * — **le bouton « + » du composeur** — voir `components/chat/Composer.tsx` ;
 * — **les deux boutons de droite de l'en-tête** : le pictogramme « maison » du
 *   tête-à-tête et le « ⋮ » du groupe. Le premier mène au Daara, que rien ne
 *   rattache à une conversation directe côté serveur. Le second ouvre un menu
 *   dont la seule action réelle serait la sourdine — or `is_muted` vit sur
 *   `ChatMembership` et n'est PAS dans `ChatSerializer.Meta.fields` : la bascule
 *   ne pourrait pas afficher son propre état. Un interrupteur dont on ne sait
 *   pas s'il est allumé n'est pas un interrupteur.
 *
 * ── Le reçu de Jëf ─────────────────────────────────────────────────────────
 *
 * Il n'est pas un message : voir `components/chat/JefReceipt.tsx` pour d'où il
 * vient. Rappel de la règle des rôles : `canSeeAmounts` masque à un talibé les
 * sommes COLLECTÉES, jamais son propre Jëf. Les reçus affichés ici sont les
 * siens et rien que les siens — le filtre est sur `donor`.
 *
 * ── Le clavier ─────────────────────────────────────────────────────────────
 *
 * `KeyboardAvoidingView` en `behavior="padding"` sur les DEUX plateformes.
 * D'ordinaire Android se contente d'`adjustResize`, mais `edgeToEdgeEnabled`
 * est actif (`app.json`) : la fenêtre ne se redimensionne plus, et sans la
 * marge le composeur passerait sous le clavier. NON VÉRIFIÉ SUR APPAREIL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

import { Composer } from "@/components/chat/Composer";
import { JefReceipt } from "@/components/chat/JefReceipt";
import { DayDivider, MessageBubble, SystemNote } from "@/components/chat/MessageBubble";
import { PinnedAnnouncement, pickPinned } from "@/components/chat/PinnedAnnouncement";
import { daysBetween } from "@/components/chat/ChatRow";
import { Avatar, AvatarStack, type StackedPerson } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import { formatNumber } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import type { Announcement, Chat, ChatMember, Message } from "@/types/content.types";
import type { Donation } from "@/types/donation.types";
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

/** Visages montrés dans l'en-tête d'un salon avant que la pile ne se ferme. */
const HEADER_FACES = 2;
/** Diamètre des visages de l'en-tête, mesuré sur la planche. */
const HEADER_FACE = 34;

/**
 * Le rôle, en clair. `UserBriefSerializer` renvoie la valeur brute de
 * `User.Role` ; « member » n'est pas un mot que l'on montre à un talibé.
 */
const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  chef_daara: "Chef du Daara",
  collector: "Collecteur",
  member: "Talibé",
  tutelle: "Sous tutelle",
};

function parseId(value?: string | string[]): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

interface ConversationState {
  status: "loading" | "ready" | "failed";
  chat: Chat | null;
  messages: Message[];
  members: ChatMember[];
  /** L'annonce du Daara à épingler, en salon seulement. */
  pinned: Announcement | null;
  /** Les Jëfs de l'utilisateur sur le Ndiguel de cette conversation. */
  receipts: Donation[];
}

const EMPTY: ConversationState = {
  status: "failed",
  chat: null,
  messages: [],
  members: [],
  pinned: null,
  receipts: [],
};

/**
 * Un seul chargement, qui rend un état COMPLET — le `setState` vit après
 * l'`await`, comme l'exige `react-hooks/set-state-in-effect`.
 *
 * Deux vagues, et c'est délibéré. La première porte ce SANS QUOI L'ÉCRAN
 * N'EXISTE PAS : la conversation et ses messages. La seconde porte ce qui
 * l'enrichit — les membres, l'annonce, les reçus — et dont l'échec ne doit
 * jamais faire basculer l'écran en erreur : un fil se lit très bien sans la
 * pile de visages de son en-tête. Elle dépend de la première, qui seule dit si
 * la conversation est un salon (annonce) et si elle porte un Ndiguel (reçus).
 */
async function fetchConversation(
  chatId: number,
  userId: number | undefined,
): Promise<ConversationState> {
  const [chat, messages] = await Promise.all([
    ContentService.getChatById(chatId).catch(() => null),
    ContentService.getChatMessages(chatId).catch(() => null),
  ]);
  if (!chat || !messages) return EMPTY;

  const [members, announcements, donations] = await Promise.all([
    ContentService.getChatMembers(chatId).catch(() => []),
    chat.chat_type === "group" && chat.daara
      ? ContentService.getAnnouncements().catch(() => [])
      : Promise.resolve([]),
    chat.campaign ? ContentService.getDonations().catch(() => []) : Promise.resolve([]),
  ]);

  /*
    L'horodatage de lecture, posé sans attendre : c'est lui qui vide la
    pastille de non-lus au retour sur la liste. Son échec ne concerne pas
    l'affichage — au pire la pastille reste, elle ne ment pas pour autant.
  */
  ContentService.markChatRead(chatId).catch(() => undefined);

  return {
    status: "ready",
    chat,
    messages,
    members,
    pinned: pickPinned(announcements, chat.daara),
    /*
      Ses Jëfs, à lui, sur ce Ndiguel, et payés. `getDonations()` rend ce que le
      rôle autorise — un chef de Daara y voit ceux de tout son Daara : le filtre
      sur `donor` est donc ce qui garantit qu'un reçu affiché ici est bien celui
      de la personne qui regarde.
    */
    receipts: donations.filter(
      (donation) =>
        donation.campaign === chat.campaign &&
        donation.donor === userId &&
        donation.payment_status === "confirmed",
    ),
  };
}

export default function ConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const chatId = parseId(params.id);
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const scrollRef = useRef<ScrollView>(null);

  const [state, setState] = useState<ConversationState>(
    chatId ? { ...EMPTY, status: "loading" } : EMPTY,
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!chatId) return;
    let active = true;
    fetchConversation(chatId, userId).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [chatId, userId]);

  const reload = useCallback(async () => {
    if (!chatId) return;
    setState(await fetchConversation(chatId, userId));
  }, [chatId, userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const { status, chat, messages, members, pinned, receipts } = state;
  const isGroup = chat?.chat_type === "group";

  const timeline = useMemo(
    () => buildTimeline(messages, receipts, userId),
    [messages, receipts, userId],
  );

  async function handleSend() {
    const body = draft.trim();
    if (!chatId || !body || sending) return;

    setSending(true);
    try {
      const created = await ContentService.createMessage({ chat: chatId, content: body });
      setState((previous) => ({ ...previous, messages: [...previous.messages, created] }));
      setDraft("");
    } catch {
      Alert.alert(
        "Message non envoyé",
        "Il n'est pas parti. Vérifiez votre connexion, puis réessayez — votre texte est conservé.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!chatId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top + Space.huge }]}>
        <ErrorState
          title="Conversation introuvable"
          body="Ce lien ne désigne aucune conversation."
          retryLabel="Revenir aux messages"
          onRetry={() => router.replace("/chat")}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ConversationHeader
        chat={chat}
        members={members}
        currentUserId={userId}
        loading={status === "loading"}
        topInset={insets.top}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/chat"))}
      />

      {isGroup && pinned ? (
        <PinnedAnnouncement
          announcement={pinned}
          onPress={() => router.push("/announcements")}
        />
      ) : null}

      {status === "failed" ? (
        <View style={[styles.centered, styles.failed]}>
          <ErrorState body="Cette conversation n'a pas pu être chargée." onRetry={reload} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          /*
            Le fil se cale en bas à chaque changement de hauteur : chargement,
            envoi, ouverture du clavier. C'est le point d'arrivée d'une
            conversation — on la reprend là où elle s'est arrêtée.
          */
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Violet[500]} />
          }
        >
          {status === "loading" ? (
            <ThreadSkeleton />
          ) : timeline.length === 0 ? (
            <Text style={styles.silent}>
              {isGroup
                ? "Personne n'a encore écrit dans ce salon."
                : "Aucun message pour l'instant. Écrivez le premier."}
            </Text>
          ) : (
            timeline.map((entry) => {
              switch (entry.kind) {
                case "day":
                  return <DayDivider key={entry.key} label={entry.label} />;
                case "system":
                  return <SystemNote key={entry.key} content={entry.content} />;
                case "receipt":
                  return (
                    <JefReceipt
                      key={entry.key}
                      donation={entry.donation}
                      campaignName={entry.donation.campaign_name}
                    />
                  );
                case "message":
                  return (
                    <MessageBubble
                      key={entry.key}
                      message={entry.message}
                      mine={entry.mine}
                      leading={entry.leading}
                      group={isGroup}
                    />
                  );
              }
            })
          )}
        </ScrollView>
      )}

      <Composer
        value={draft}
        onChangeText={setDraft}
        onSend={handleSend}
        placeholder={isGroup ? "Message au Daara…" : "Écrire un message…"}
        sending={sending}
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ConversationHeader({
  chat,
  members,
  currentUserId,
  loading,
  topInset,
  onBack,
}: {
  chat: Chat | null;
  members: ChatMember[];
  currentUserId: number | undefined;
  loading: boolean;
  topInset: number;
  onBack: () => void;
}) {
  const isGroup = chat?.chat_type === "group";

  /*
    En tête-à-tête, l'interlocuteur est le membre qui n'est pas soi. C'est le
    seul endroit d'où l'on tire son RÔLE : `ChatSerializer` rend son nom et sa
    photo (`display_name`, `avatar`) mais pas son rôle, que seul
    `comms/{id}/members/` porte.
  */
  const other = members.find((member) => member.id !== currentUserId) ?? null;

  /* Son propre visage n'apprend rien : la pile montre les AUTRES membres. */
  const faces: StackedPerson[] = members
    .filter((member) => member.id !== currentUserId)
    .slice(0, HEADER_FACES)
    .map((member) => ({ uri: member.avatar, name: member.name }));

  const subtitle = isGroup
    ? memberCountLabel(chat?.members_count ?? members.length)
    : [other?.role ? ROLE_LABEL[other.role] : null, other?.daara_name]
        .filter(Boolean)
        .join(" · ");

  return (
    <View style={[styles.header, { paddingTop: topInset + Space.xs }]}>
      <IconButton
        icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
        accessibilityLabel="Revenir aux messages"
        onPress={onBack}
      />

      {loading || !chat ? (
        <>
          <Skeleton width={40} height={40} radius={Radius.avatar} />
          <View style={styles.headerText}>
            <Skeleton width={140} height={15} delay={150} />
            <Skeleton width={90} height={11} delay={300} />
          </View>
        </>
      ) : (
        <>
          {isGroup && faces.length > 0 ? (
            <AvatarStack people={faces} size={HEADER_FACE} max={HEADER_FACES} />
          ) : (
            <Avatar uri={chat.avatar} name={chat.display_name} size={40} />
          )}

          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {chat.display_name}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.headerSubtitle, !isGroup && styles.headerSubtitleDirect]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function ThreadSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton width="62%" height={54} radius={Radius.card} />
      <Skeleton width="48%" height={40} radius={Radius.card} delay={150} style={styles.skeletonMine} />
      <Skeleton width="70%" height={62} radius={Radius.card} delay={300} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type Entry =
  | { kind: "day"; key: string; label: string }
  | { kind: "system"; key: string; content: string }
  | { kind: "receipt"; key: string; donation: Donation }
  | { kind: "message"; key: string; message: Message; mine: boolean; leading: boolean };

/**
 * Le fil, dans l'ordre : messages et reçus de Jëf entremêlés par date, coupés
 * par un séparateur à chaque changement de jour.
 *
 * `leading` marque la PREMIÈRE bulle d'une suite du même auteur — c'est elle
 * qui porte le visage et le nom en conversation de groupe. Un reçu ou un
 * changement de jour rompt la suite : la bulle qui vient après est de nouveau
 * signée, sans quoi on ne saurait plus qui parle.
 */
function buildTimeline(
  messages: Message[],
  receipts: Donation[],
  currentUserId: number | undefined,
): Entry[] {
  const items = [
    ...messages.map((message) => ({ at: message.sent_at, message, donation: null })),
    ...receipts.map((donation) => ({ at: donation.created_at, message: null, donation })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const entries: Entry[] = [];
  let lastDay: string | null = null;
  let lastAuthor: number | null = null;

  for (const item of items) {
    const date = new Date(item.at);
    const day = Number.isNaN(date.getTime()) ? "" : date.toDateString();

    if (day && day !== lastDay) {
      entries.push({ kind: "day", key: `day-${day}`, label: dayLabel(date) });
      lastDay = day;
      lastAuthor = null;
    }

    if (item.donation) {
      entries.push({
        kind: "receipt",
        key: `receipt-${item.donation.id}`,
        donation: item.donation,
      });
      lastAuthor = null;
      continue;
    }

    const message = item.message!;
    if (message.message_type === "system") {
      entries.push({ kind: "system", key: `sys-${message.id}`, content: message.content });
      lastAuthor = null;
      continue;
    }

    const authorId = message.sender?.id ?? null;
    entries.push({
      kind: "message",
      key: `msg-${message.id}`,
      message,
      mine: authorId !== null && authorId === currentUserId,
      leading: authorId !== lastAuthor,
    });
    lastAuthor = authorId;
  }

  return entries;
}

/** « Aujourd'hui », « Hier », puis la date — « 13 septembre », l'année au-delà. */
function dayLabel(date: Date): string {
  const days = daysBetween(date, new Date());
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** « 412 talibés ». Le singulier compte : un salon peut n'avoir que son chef. */
function memberCountLabel(count: number): string {
  if (count <= 0) return "";
  return count === 1 ? "1 talibé" : `${formatNumber(count)} talibés`;
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.alt },
  centered: { flex: 1, paddingHorizontal: GUTTER, justifyContent: "center" },
  failed: { paddingVertical: Space.huge },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: GUTTER,
    paddingBottom: 14,
    backgroundColor: Surface.default,
    borderBottomWidth: 1,
    borderBottomColor: Border.hairline,
  },
  headerText: { flex: 1, minWidth: 0, gap: 1 },
  headerTitle: { ...UIType.rowTitle, color: Ink[900] },
  headerSubtitle: { ...Type.micro, color: Ink[500] },
  /** En tête-à-tête, le sous-titre porte le rôle : il passe en violet. */
  headerSubtitleDirect: { color: Violet[700] },

  thread: { flex: 1 },
  threadContent: {
    paddingHorizontal: GUTTER,
    paddingVertical: Space.lg,
    gap: 10,
    flexGrow: 1,
  },
  silent: {
    ...UIType.stateBody,
    color: Ink[300],
    textAlign: "center",
    marginTop: Space.huge,
  },

  skeleton: { gap: Space.md },
  skeletonMine: { alignSelf: "flex-end" },
});
