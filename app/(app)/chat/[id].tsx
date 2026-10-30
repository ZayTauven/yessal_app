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
 * ── Ce que la refonte de la messagerie (2026-10-29) a apporté ───────────────
 *
 * — **Le temps réel** (`lib/realtime.ts`) : les messages, réactions,
 *   suppressions et accusés de lecture arrivent seuls. Avant, le fil ne
 *   bougeait qu'au tirer-pour-rafraîchir.
 * — **« écrit… »** dans l'en-tête, relayé par le canal de présence — le
 *   serveur n'y est pour rien, ce sont les téléphones qui se le disent.
 * — **Le « Vu »** du tête-à-tête : la double coche, quand l'autre a ouvert le fil.
 * — **L'appui long** sur une bulle : réagir, répondre, copier, supprimer.
 * — **Les photos** : le « + » du composeur, et la vignette dans le fil.
 * — **La sourdine**, enfin pilotable : `is_muted` est désormais servi par
 *   `ChatSerializer`, l'interrupteur peut donc afficher son propre état.
 * — **Une liste inversée** (`FlatList inverted`) au lieu d'un `ScrollView`
 *   recalé en bas à chaque changement de hauteur : on peut remonter l'histoire
 *   pendant qu'un salon parle, et les messages plus anciens se chargent par
 *   pages en arrivant en haut.
 *
 * ── Le reçu de Jëf ─────────────────────────────────────────────────────────
 *
 * Il n'est pas un message : voir `components/chat/JefReceipt.tsx` pour d'où il
 * vient. Rappel de la règle des rôles : `canSeeAmounts` masque à un talubé les
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
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Bell, BellOff, ChevronLeft, Pin, PinOff, SmilePlus, X } from "lucide-react-native";

import { ChannelGlyph } from "@/components/chat/ChannelIcon";

import { Composer } from "@/components/chat/Composer";
import { AudioBubble, JefCardView } from "@/components/chat/JefCard";
import { JefReceipt } from "@/components/chat/JefReceipt";
import { MessageActions } from "@/components/chat/MessageActions";
import { DayDivider, MessageBubble, SystemNote } from "@/components/chat/MessageBubble";
import { PinnedAnnouncement, pickPinned } from "@/components/chat/PinnedAnnouncement";
import { daysBetween } from "@/components/chat/ChatRow";
import { Avatar, AvatarStack, type StackedPerson } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContentService, normalizeIncomingMessage } from "@/lib/content.service";
import { formatNumber } from "@/lib/format";
import { setChatOuvert } from "@/lib/push.service";
import { listen, onReconnect, whisper } from "@/lib/realtime";
import { useAuthStore } from "@/store/auth.store";
import type { Announcement, Attachment, Chat, ChatMember, Message, MessageReaction } from "@/types/content.types";
import type { Donation } from "@/types/donation.types";
import {
  Border,
  Font,
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
/** « écrit… » renvoyé au plus toutes les 3 s ; effacé chez l'autre après 6 s sans nouvelle. */
const TYPING_THROTTLE_MS = 3000;
const TYPING_EXPIRE_MS = 6000;

/**
 * Le rôle, en clair. `UserBriefSerializer` renvoie la valeur brute de
 * `User.Role` ; « member » n'est pas un mot que l'on montre à un talubé.
 */
const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  chef_daara: "Coordinateur du Daara",
  collector: "Collecteur",
  member: "Talubé",
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
  hasMore: boolean;
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
  hasMore: false,
  members: [],
  pinned: null,
  receipts: [],
};

/**
 * Un seul chargement, qui rend un état COMPLET — le `setState` vit après
 * l'`await`, comme l'exige `react-hooks/set-state-in-effect`.
 *
 * Deux vagues, et c'est délibéré. La première porte ce SANS QUOI L'ÉCRAN
 * N'EXISTE PAS : la conversation et la dernière page de messages. La seconde
 * porte ce qui l'enrichit — les membres, l'annonce, les reçus — et dont
 * l'échec ne doit jamais faire basculer l'écran en erreur.
 */
async function fetchConversation(
  chatId: number,
  userId: number | undefined,
): Promise<ConversationState> {
  const [chat, page] = await Promise.all([
    ContentService.getChatById(chatId).catch(() => null),
    ContentService.getChatMessagesPage(chatId).catch(() => null),
  ]);
  if (!chat || !page) return EMPTY;

  const [members, announcements, donations] = await Promise.all([
    ContentService.getChatMembers(chatId).catch(() => []),
    chat.chat_type === "group" && chat.daara
      ? ContentService.getAnnouncements().catch(() => [])
      : Promise.resolve([]),
    chat.campaign ? ContentService.getDonations().catch(() => []) : Promise.resolve([]),
  ]);

  /*
    L'horodatage de lecture, posé sans attendre : c'est lui qui vide la
    pastille de non-lus au retour sur la liste — et qui allume le « Vu » chez
    l'autre, par le canal du fil.
  */
  ContentService.markChatRead(chatId).catch(() => undefined);

  return {
    status: "ready",
    chat,
    messages: page.messages,
    hasMore: page.hasMore,
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

function applyReaction(
  reactions: MessageReaction[],
  emoji: string,
  add: boolean,
  mine: boolean,
): MessageReaction[] {
  const next = reactions.map((r) => ({ ...r }));
  const i = next.findIndex((r) => r.emoji === emoji);
  if (add) {
    if (i >= 0) {
      next[i].count += 1;
      if (mine) next[i].reacted_by_me = true;
    } else next.push({ emoji, count: 1, reacted_by_me: mine });
  } else if (i >= 0) {
    next[i].count -= 1;
    if (mine) next[i].reacted_by_me = false;
    if (next[i].count <= 0) next.splice(i, 1);
  }
  return next;
}

/** Ajoute ou remplace par identifiant, en gardant l'ordre chronologique. */
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime() || a.id - b.id,
  );
}

export default function ConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const chatId = parseId(params.id);
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Moi";

  const [state, setState] = useState<ConversationState>(
    chatId ? { ...EMPTY, status: "loading" } : EMPTY,
  );
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [acting, setActing] = useState<Message | null>(null);
  const [viewing, setViewing] = useState<Message | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState<Record<number, { name: string; at: number }>>({});
  const lastTypingSent = useRef(0);

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

  /* Tant que ce fil est à l'écran, ses pushes ne s'affichent pas en bannière. */
  useEffect(() => {
    if (!chatId) return;
    setChatOuvert(chatId);
    const sub = AppState.addEventListener("change", (next) => setChatOuvert(next === "active" ? chatId : null));
    return () => {
      sub.remove();
      setChatOuvert(null);
    };
  }, [chatId]);

  // ─── Temps réel ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !userId) return;

    const offChat = listen(`private-chat.${chatId}`, {
      "new-message": ((raw: unknown) => {
        const incoming = normalizeIncomingMessage(raw);
        setState((previous) => {
          if (previous.messages.some((m) => m.id === incoming.id)) return previous;
          /* Mon propre message peut arriver ici avant la réponse HTTP : il
             remplace sa bulle « en cours » au lieu de la doubler. */
          let messages = previous.messages;
          if (incoming.sender?.id === userId) {
            /* Par l'identifiant donné à la bulle — deux photos sans légende
               envoyées d'affilée ont le même contenu vide et se confondaient. */
            const idx = messages.findIndex((m) =>
              incoming.client_id
                ? m.local?.clientId === incoming.client_id
                : m.local?.status === "sending" && m.content === incoming.content,
            );
            if (idx >= 0) messages = messages.filter((_, i) => i !== idx);
          }
          return { ...previous, messages: mergeMessages(messages, [incoming]) };
        });
        if (incoming.sender?.id !== userId && AppState.currentState === "active") {
          ContentService.markChatRead(chatId).catch(() => undefined);
        }
        if (incoming.sender?.id) {
          setTyping((t) => {
            const next = { ...t };
            delete next[incoming.sender!.id];
            return next;
          });
        }
      }) as never,
      "message-reaction": ((data: {
        message_id: number;
        emoji: string;
        user_id: number;
        action: "add" | "remove";
        reactions?: { emoji: string; count: number; user_ids: number[] }[];
      }) => {
        /* L'état complet, quand le serveur l'envoie : appliqué tel quel, y
           compris pour ses propres réactions faites sur un autre appareil. */
        if (data.reactions) {
          const next = data.reactions.map((r) => ({
            emoji: r.emoji,
            count: r.count,
            reacted_by_me: userId !== undefined && r.user_ids.includes(userId),
          }));
          setState((previous) => ({
            ...previous,
            messages: previous.messages.map((m) => (m.id === data.message_id ? { ...m, reactions: next } : m)),
          }));
          return;
        }
        if (data.user_id === userId) return; // déjà appliquée, de façon optimiste
        setState((previous) => ({
          ...previous,
          messages: previous.messages.map((m) =>
            m.id === data.message_id
              ? { ...m, reactions: applyReaction(m.reactions, data.emoji, data.action === "add", false) }
              : m,
          ),
        }));
      }) as never,
      "message-edited": ((raw: unknown) => {
        const edited = normalizeIncomingMessage(raw);
        setState((previous) => ({
          ...previous,
          messages: previous.messages.map((m) =>
            m.id === edited.id ? { ...m, content: edited.content, edited_at: edited.edited_at } : m,
          ),
        }));
      }) as never,
      "message-deleted": ((data: { message_id: number }) => {
        setState((previous) => ({
          ...previous,
          messages: previous.messages.map((m) =>
            m.id === data.message_id ? { ...m, is_deleted: true, content: "Message supprimé", file_url: null } : m,
          ),
        }));
      }) as never,
      "chat-read": ((data: { user_id: number; read_at: string }) => {
        if (data.user_id === userId) return;
        setState((previous) =>
          previous.chat ? { ...previous, chat: { ...previous.chat, peer_last_read_at: data.read_at } } : previous,
        );
      }) as never,
      /* Un message épinglé (ou désépinglé) par l'administration ou un auteur. */
      "chat-pinned": ((data: { pinned_message: Chat["pinned_message"] }) => {
        setState((previous) =>
          previous.chat ? { ...previous, chat: { ...previous.chat, pinned_message: data.pinned_message } } : previous,
        );
      }) as never,
      /* Renommé, archivé, réglé autrement : on relit le fil. */
      "chat-settings": (() => {
        ContentService.getChatById(chatId)
          .then((fresh) => setState((previous) => ({ ...previous, chat: fresh })))
          .catch(() => undefined);
      }) as never,
    });

    const offPresence = listen(`presence-chat.${chatId}`, {
      "client-typing": ((data: { user_id: number; name: string; typing: boolean }) => {
        if (data.user_id === userId) return;
        setTyping((t) => {
          const next = { ...t };
          if (data.typing) next[data.user_id] = { name: data.name, at: Date.now() };
          else delete next[data.user_id];
          return next;
        });
      }) as never,
    });

    /* Après une coupure réseau : la dernière page, refusionnée. */
    const offReconnect = onReconnect(() => {
      ContentService.getChatMessagesPage(chatId)
        .then((page) => setState((previous) => ({ ...previous, messages: mergeMessages(previous.messages, page.messages) })))
        .catch(() => undefined);
    });

    return () => {
      offChat();
      offPresence();
      offReconnect();
    };
  }, [chatId, userId]);

  /* Un « écrit… » orphelin (réseau coupé, appli fermée) s'éteint seul. */
  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const timer = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const kept = Object.fromEntries(Object.entries(t).filter(([, v]) => now - v.at < TYPING_EXPIRE_MS));
        return Object.keys(kept).length === Object.keys(t).length ? t : kept;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [typing]);

  /*
    Au retour au premier plan, on rattrape ce que le socket a pu manquer
    pendant que le téléphone dormait : la dernière page, fusionnée.
  */
  useEffect(() => {
    if (!chatId) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      ContentService.getChatMessagesPage(chatId)
        .then((page) => setState((previous) => ({ ...previous, messages: mergeMessages(previous.messages, page.messages) })))
        .catch(() => undefined);
      ContentService.markChatRead(chatId).catch(() => undefined);
    });
    return () => sub.remove();
  }, [chatId]);

  const { status, chat, messages, members, pinned, receipts, hasMore } = state;
  const isGroup = chat?.chat_type === "group";
  const isChannel = chat?.chat_type === "channel";
  /* Épingler : l'administration ; dans un canal, ses auteurs ; dans un salon, son créateur. */
  const canPin = Boolean(
    chat &&
      !chat.archived_at &&
      chat.chat_type !== "direct" &&
      (user?.role === "admin" || (isChannel && chat.can_post) || (isGroup && chat.created_by === userId)),
  );

  async function handlePin(message: Message | null) {
    if (!chat) return;
    try {
      const epingle = await ContentService.pinMessage(chat.id, message ? message.id : null);
      setState((previous) => (previous.chat ? { ...previous, chat: { ...previous.chat, pinned_message: epingle } } : previous));
    } catch {
      Alert.alert("Épingle impossible", "Vérifiez votre connexion, puis réessayez.");
    }
  }

  /** Le dernier de MES messages que l'autre a lu — la double coche se pose dessus. */
  const peerReadAt = chat?.peer_last_read_at ?? null;
  const seenId = useMemo(() => {
    if (isGroup || !peerReadAt) return null;
    const limit = new Date(peerReadAt).getTime();
    let found: number | null = null;
    for (const m of messages) {
      if (m.sender?.id === userId && !m.local && new Date(m.sent_at).getTime() <= limit) found = m.id;
    }
    return found;
  }, [messages, isGroup, peerReadAt, userId]);

  /* Inversée : le plus récent en premier, la `FlatList` le pose en bas. */
  const timeline = useMemo(
    () => buildTimeline(messages, receipts, userId).reverse(),
    [messages, receipts, userId],
  );

  const loadOlder = useCallback(async () => {
    if (!chatId || !hasMore || loadingOlder) return;
    const oldest = messages.find((m) => !m.local);
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const page = await ContentService.getChatMessagesPage(chatId, oldest.id);
      setState((previous) => ({
        ...previous,
        messages: mergeMessages(previous.messages, page.messages),
        hasMore: page.hasMore,
      }));
    } catch {
      /* On réessaiera au prochain passage en haut du fil. */
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, hasMore, loadingOlder, messages]);

  function onDraftChange(value: string) {
    setDraft(value);
    if (!chatId || !userId) return;
    const now = Date.now();
    if (now - lastTypingSent.current > TYPING_THROTTLE_MS) {
      lastTypingSent.current = now;
      whisper(`presence-chat.${chatId}`, "client-typing", {
        user_id: userId,
        name: user?.first_name || "Quelqu'un",
        typing: value.length > 0,
      });
    }
  }

  async function deliver(local: Message) {
    if (!chatId) return;
    try {
      const created = await ContentService.createMessage({
        chat: chatId,
        content: local.content,
        reply_to: local.reply_to ?? null,
        attachment: local.local?.attachment ?? null,
        client_id: local.local?.clientId ?? null,
      });
      setState((previous) => ({
        ...previous,
        messages: mergeMessages(
          previous.messages.filter((m) => m.id !== local.id),
          [created],
        ),
      }));
    } catch {
      setState((previous) => ({
        ...previous,
        messages: previous.messages.map((m) =>
          m.id === local.id ? { ...m, local: { ...m.local, status: "failed" } } : m,
        ),
      }));
    }
  }

  async function saveEdit() {
    const target = editing;
    const body = draft.trim();
    if (!target || !body) return;
    setEditing(null);
    setDraft("");
    if (body === target.content) return;
    try {
      const saved = await ContentService.editMessage(target.id, body);
      setState((previous) => ({
        ...previous,
        messages: previous.messages.map((m) =>
          m.id === target.id ? { ...m, content: saved.content, edited_at: saved.edited_at } : m,
        ),
      }));
    } catch {
      Alert.alert("Modification non enregistrée", "Vérifiez votre connexion, puis réessayez.");
    }
  }

  function sendWith(body: string, file: Attachment | null) {
    if (!chatId || !userId || (!body && !file)) return;
    lastTypingSent.current = 0;
    whisper(`presence-chat.${chatId}`, "client-typing", { user_id: userId, name: "", typing: false });

    /*
      La bulle part dans le fil AVANT la réponse du serveur, marquée « en
      cours ». Sur une connexion lente, c'est ce qui évite le double envoi :
      on voit que le message est parti.
    */
    const local: Message = {
      id: -Date.now(),
      chat: chatId,
      sender: { id: userId, name: userName, avatar: user?.avatar ?? null },
      message_type: file ? "file" : "text",
      content: body,
      file_url: null,
      file_name: file?.name ?? null,
      file_size: file?.size ?? null,
      file_is_image: file?.kind === "image",
      file_kind: file?.kind ?? null,
      reply_to: replyingTo?.id ?? null,
      reply_preview: replyingTo
        ? {
            id: replyingTo.id,
            sender_name: replyingTo.sender?.name ?? "",
            content: replyingTo.message_type === "file" ? "Pièce jointe" : replyingTo.content,
            message_type: replyingTo.message_type,
            is_deleted: replyingTo.is_deleted,
          }
        : null,
      is_deleted: false,
      reactions: [],
      sent_at: new Date().toISOString(),
      local: {
        status: "sending",
        imageUri: file?.kind === "image" ? file.uri : null,
        attachment: file,
        clientId: `mob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    };
    setState((previous) => ({ ...previous, messages: [...previous.messages, local] }));
    setReplyingTo(null);
    deliver(local);
  }

  function handleSend() {
    if (editing) {
      saveEdit();
      return;
    }
    const body = draft.trim();
    if (!body && !attachment) return;
    sendWith(body, attachment);
    setDraft("");
    setAttachment(null);
  }

  function handleRetry(message: Message) {
    const again: Message = {
      ...message,
      sent_at: new Date().toISOString(),
      local: { ...message.local, status: "sending" },
    };
    setState((previous) => ({
      ...previous,
      messages: [...previous.messages.filter((m) => m.id !== message.id), again],
    }));
    deliver(again);
  }

  async function handleReact(message: Message, emoji: string) {
    const already = message.reactions.find((r) => r.emoji === emoji)?.reacted_by_me ?? false;
    const patch = (add: boolean) =>
      setState((previous) => ({
        ...previous,
        messages: previous.messages.map((m) =>
          m.id === message.id ? { ...m, reactions: applyReaction(m.reactions, emoji, add, true) } : m,
        ),
      }));
    patch(!already);
    try {
      await ContentService.toggleReaction(message.id, emoji);
    } catch {
      patch(already);
    }
  }

  function handleDelete(message: Message) {
    Alert.alert(
      "Supprimer ce message ?",
      "Les autres verront « Message supprimé » à sa place.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await ContentService.deleteMessage(message.id);
              setState((previous) => ({
                ...previous,
                messages: previous.messages.map((m) =>
                  m.id === message.id ? { ...m, is_deleted: true, content: "Message supprimé", file_url: null } : m,
                ),
              }));
            } catch {
              Alert.alert("Suppression impossible", "Vérifiez votre connexion, puis réessayez.");
            }
          },
        },
      ],
    );
  }

  async function handleCopy(message: Message) {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(message.content);
  }

  async function handleToggleMute() {
    if (!chatId || !chat) return;
    try {
      const muted = await ContentService.toggleMute(chatId);
      setState((previous) => (previous.chat ? { ...previous, chat: { ...previous.chat, is_muted: muted } } : previous));
    } catch {
      Alert.alert("Réglage non enregistré", "Vérifiez votre connexion, puis réessayez.");
    }
  }

  function openActions(message: Message) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setActing(message);
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

  const typingNames = Object.values(typing).map((t) => t.name);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ConversationHeader
        chat={chat}
        members={members}
        currentUserId={userId}
        loading={status === "loading"}
        topInset={insets.top}
        typingNames={typingNames}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/chat"))}
        onToggleMute={handleToggleMute}
      />

      {isGroup && pinned ? (
        <PinnedAnnouncement announcement={pinned} onPress={() => router.push("/announcements")} />
      ) : null}

      {isChannel && chat?.description ? (
        <Text style={styles.channelIntro}>{chat.description}</Text>
      ) : null}

      {chat?.pinned_message ? (
        <View style={styles.pinBar}>
          <Pin size={15} color={Violet[700]} strokeWidth={1.8} />
          <View style={styles.pinText}>
            <Text style={styles.pinLabel}>ÉPINGLÉ</Text>
            <Text style={styles.pinPreview} numberOfLines={1}>
              {chat.pinned_message.preview}
            </Text>
          </View>
          {canPin ? (
            <Pressable
              onPress={() => handlePin(null)}
              accessibilityRole="button"
              accessibilityLabel="Désépingler"
              hitSlop={Space.sm}
              style={styles.pinOff}
            >
              <PinOff size={16} color={Ink[500]} strokeWidth={1.8} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {status === "failed" ? (
        <View style={[styles.centered, styles.failed]}>
          <ErrorState body="Cette conversation n'a pas pu être chargée." onRetry={reload} />
        </View>
      ) : status === "loading" ? (
        <View style={styles.thread}>
          <ThreadSkeleton />
        </View>
      ) : (
        <FlatList
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          data={timeline}
          inverted
          keyExtractor={(entry) => entry.key}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingOlder ? <ActivityIndicator color={Violet[500]} style={styles.older} /> : null
          }
          ListEmptyComponent={
            <Text style={[styles.silent, styles.flipped]}>
              {isGroup
                ? "Personne n'a encore écrit dans ce salon. Un mot d'accueil suffit souvent."
                : "Aucun message pour l'instant. Écrivez le premier."}
            </Text>
          }
          ListHeaderComponent={
            typingNames.length > 0 ? (
              <Text style={styles.typing}>
                {typingNames.length === 1 ? `${typingNames[0]} écrit…` : "Plusieurs personnes écrivent…"}
              </Text>
            ) : null
          }
          renderItem={({ item: entry }) => {
            switch (entry.kind) {
              case "day":
                return <DayDivider label={entry.label} />;
              case "system":
                return <SystemNote content={entry.content} />;
              case "receipt":
                return <JefReceipt donation={entry.donation} campaignName={entry.donation.campaign_name} />;
              case "message":
                if (isChannel) {
                  const m = entry.message;
                  const chips = (
                    <ReactionChips message={m} light={m.payload?.variant === "palier"} onToggle={handleReact} onMore={openActions} />
                  );
                  if (m.message_type === "card" && m.payload) {
                    return (
                      <Pressable onLongPress={() => openActions(m)} delayLongPress={280}>
                        <JefCardView message={m} footer={chips} />
                      </Pressable>
                    );
                  }
                  return <ChannelPost message={m} chat={chat} footer={chips} onLongPress={openActions} onOpenImage={setViewing} />;
                }
                return (
                  <MessageBubble
                    message={entry.message}
                    mine={entry.mine}
                    leading={entry.leading}
                    group={isGroup}
                    seen={entry.message.id === seenId}
                    onLongPress={openActions}
                    onToggleReaction={handleReact}
                    onOpenImage={setViewing}
                    onRetry={handleRetry}
                  />
                );
            }
          }}
        />
      )}

      <Composer
        value={draft}
        onChangeText={onDraftChange}
        onSend={handleSend}
        placeholder={isChannel ? "Publier une annonce…" : isGroup ? "Message au Daara…" : "Écrire un message…"}
        bottomInset={insets.bottom}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editing={editing}
        onCancelEdit={() => {
          setEditing(null);
          setDraft("");
        }}
        attachment={attachment}
        onAttach={setAttachment}
        onSendVoice={(voice) => sendWith("", voice)}
        members={isGroup ? members : []}
        currentUserId={userId}
        readOnlyNote={
          chat?.archived_at
            ? "Ce fil est archivé : on peut le relire, plus y écrire."
            : isChannel && chat && !chat.can_post
              ? chat.channel_kind === "jefs"
                ? "Dans ce canal, on réagit — on ne répond pas."
                : chat.channel_kind === "guide"
                  ? "Seul Sangue Bi publie ici. Appui long pour réagir."
                  : "Seuls les auteurs du canal publient ici. Appui long pour réagir."
              : null
        }
      />

      <MessageActions
        message={acting}
        canDelete={!!acting && acting.message_type !== "card" && (acting.sender?.id === userId || user?.role === "admin")}
        canEdit={!!acting && acting.sender?.id === userId && acting.message_type === "text"}
        canReply={!isChannel && !chat?.archived_at}
        onPin={canPin && acting && acting.message_type !== "card" ? (m) => handlePin(m) : undefined}
        isPinned={!!acting && chat?.pinned_message?.id === acting.id}
        onEdit={(m) => {
          setReplyingTo(null);
          setEditing(m);
          setDraft(m.content);
        }}
        bottomInset={insets.bottom}
        onClose={() => setActing(null)}
        onReact={handleReact}
        onReply={setReplyingTo}
        onCopy={handleCopy}
        onDelete={handleDelete}
      />

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          {viewing?.file_url ? (
            <ExpoImage source={{ uri: viewing.file_url }} style={styles.viewerImage} contentFit="contain" cachePolicy="memory-disk" />
          ) : null}
          <View style={[styles.viewerBar, { top: insets.top + Space.sm }]}>
            <Text style={styles.viewerCaption} numberOfLines={1}>
              {viewing?.sender?.name}
            </Text>
            <Pressable onPress={() => setViewing(null)} hitSlop={Space.md} accessibilityLabel="Fermer l'image">
              <X size={26} color={Surface.default} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      </Modal>
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
  typingNames,
  onBack,
  onToggleMute,
}: {
  chat: Chat | null;
  members: ChatMember[];
  currentUserId: number | undefined;
  loading: boolean;
  topInset: number;
  typingNames: string[];
  onBack: () => void;
  onToggleMute: () => void;
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

  const typingLabel =
    typingNames.length === 0
      ? null
      : isGroup
        ? typingNames.length === 1
          ? `${typingNames[0]} écrit…`
          : `${typingNames.length} personnes écrivent…`
        : "écrit…";

  const subtitle =
    typingLabel ??
    (chat?.chat_type === "channel"
      ? "Canal du Kourel"
      : isGroup
      ? memberCountLabel(chat?.members_count ?? members.length)
      : [other?.role ? ROLE_LABEL[other.role] : null, other?.daara_name].filter(Boolean).join(" · "));

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
          {chat.chat_type === "channel" ? (
            <View style={[styles.channelIcon, chat.channel_kind === "guide" && styles.channelIconGuide]}>
              <ChannelGlyph chat={chat} size={20} color={chat.channel_kind === "guide" ? Surface.default : Violet[700]} />
            </View>
          ) : isGroup && faces.length > 0 ? (
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
                style={[
                  styles.headerSubtitle,
                  (!isGroup || typingLabel) && styles.headerSubtitleDirect,
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          <IconButton
            icon={
              chat.is_muted ? (
                <BellOff size={19} color={Ink[500]} strokeWidth={1.6} />
              ) : (
                <Bell size={19} color={Ink[900]} strokeWidth={1.6} />
              )
            }
            accessibilityLabel={chat.is_muted ? "Réactiver les notifications" : "Mettre en sourdine"}
            onPress={onToggleMute}
          />
        </>
      )}
    </View>
  );
}

/** Les réactions d'une publication de canal, et le « + » qui en ajoute une. */
function ReactionChips({
  message,
  light = false,
  onToggle,
  onMore,
}: {
  message: Message;
  light?: boolean;
  onToggle: (message: Message, emoji: string) => void;
  onMore: (message: Message) => void;
}) {
  return (
    <View style={styles.chips}>
      {message.reactions.map((r) => (
        <Pressable
          key={r.emoji}
          onPress={() => onToggle(message, r.emoji)}
          accessibilityRole="button"
          accessibilityState={{ selected: r.reacted_by_me }}
          accessibilityLabel={`${r.emoji} ${r.count}`}
          style={[styles.chip, light && styles.chipLight, r.reacted_by_me && styles.chipMine]}
        >
          <Text style={styles.chipEmoji}>{r.emoji}</Text>
          <Text style={[styles.chipCount, light && !r.reacted_by_me && styles.chipCountLight]}>{r.count}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() => onMore(message)}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une réaction"
        hitSlop={Space.sm}
        style={[styles.chip, styles.chipAdd, light && styles.chipLight]}
      >
        <SmilePlus size={14} color={light ? Surface.default : Ink[500]} strokeWidth={1.7} />
      </Pressable>
    </View>
  );
}

/** Une annonce du canal du guide : un article signé « Sangue Bi ». */
function ChannelPost({
  message,
  chat,
  footer,
  onLongPress,
  onOpenImage,
}: {
  message: Message;
  chat: Chat | null;
  footer: React.ReactNode;
  onLongPress: (message: Message) => void;
  onOpenImage: (message: Message) => void;
}) {
  const image = message.file_kind === "image" && message.file_url && !message.is_deleted;
  const author = chat?.channel_kind === "guide" ? "Sangue Bi" : message.sender?.name;
  return (
    <Pressable onLongPress={() => onLongPress(message)} delayLongPress={280} style={styles.post}>
      {image ? (
        <Pressable onPress={() => onOpenImage(message)} accessibilityRole="imagebutton" accessibilityLabel="Agrandir l'image">
          <ExpoImage source={{ uri: message.file_url! }} style={styles.postImage} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        </Pressable>
      ) : null}
      <View style={styles.postBody}>
        <View style={styles.postHead}>
          <Avatar uri={message.sender?.avatar} name={author} size={30} />
          <Text style={styles.postAuthor}>{author}</Text>
          <Text style={styles.postTime}>
            {new Date(message.sent_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        {message.is_deleted ? (
          <Text style={styles.postDeleted}>Publication retirée</Text>
        ) : (
          <>
            {message.file_kind === "audio" && message.file_url ? <AudioBubble url={message.file_url} /> : null}
            {message.content && message.content !== message.file_name ? (
              <Text style={styles.postText}>{message.content}</Text>
            ) : null}
          </>
        )}
        <View style={styles.postFooter}>{footer}</View>
      </View>
    </Pressable>
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

/** « 412 talubés ». Le singulier compte : un salon peut n'avoir que son chef. */
function memberCountLabel(count: number): string {
  if (count <= 0) return "";
  return count === 1 ? "1 talubé" : `${formatNumber(count)} talubés`;
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
  /** En tête-à-tête — ou quand quelqu'un écrit — le sous-titre passe en violet. */
  headerSubtitleDirect: { color: Violet[700] },

  thread: { flex: 1 },
  threadContent: {
    paddingHorizontal: GUTTER,
    paddingVertical: Space.lg,
    gap: 10,
    flexGrow: 1,
  },
  /* Le contenu d'une liste inversée est retourné ; l'état vide doit l'être aussi. */
  flipped: { transform: [{ scaleY: -1 }] },
  silent: {
    ...UIType.stateBody,
    color: Ink[300],
    textAlign: "center",
    marginTop: Space.huge,
  },
  typing: { ...Type.micro, color: Violet[700], paddingHorizontal: Space.sm },
  older: { paddingVertical: Space.lg },

  skeleton: { gap: Space.md, padding: GUTTER },
  skeletonMine: { alignSelf: "flex-end" },

  pinBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    paddingHorizontal: GUTTER,
    paddingVertical: Space.sm,
    backgroundColor: Violet[100],
  },
  pinText: { flex: 1, minWidth: 0 },
  pinLabel: { fontSize: 10, fontFamily: Font.extrabold, letterSpacing: 0.8, color: Violet[700] },
  pinPreview: { ...Type.label, color: Ink[900] },
  pinOff: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  channelIntro: {
    ...Type.micro,
    color: Ink[500],
    textAlign: "center",
    paddingHorizontal: GUTTER,
    paddingVertical: Space.sm,
    backgroundColor: Surface.default,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  channelIconGuide: { backgroundColor: Violet[900] },

  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, flexShrink: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.chip,
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  chipLight: { backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.2)" },
  chipMine: { backgroundColor: Violet[100], borderColor: Violet[300] },
  chipAdd: { borderStyle: "dashed", borderColor: Violet[200] },
  chipEmoji: { fontSize: 13 },
  chipCount: { ...Type.micro, color: Violet[900] },
  chipCountLight: { color: Surface.default },

  post: { backgroundColor: Surface.default, borderRadius: Radius.card, borderWidth: 1, borderColor: Border.hairline, overflow: "hidden" },
  postImage: { width: "100%", height: 170 },
  postBody: { padding: Space.lg, gap: Space.sm },
  postHead: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  postAuthor: { ...UIType.rowTitle, color: Violet[900] },
  postTime: { ...Type.micro, color: Ink[500] },
  postText: { ...Type.body, color: Ink[900] },
  postDeleted: { ...Type.label, fontStyle: "italic", color: Ink[300] },
  postFooter: { marginTop: Space.xs },

  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)", justifyContent: "center" },
  viewerImage: { width: "100%", height: "80%" },
  viewerBar: {
    position: "absolute",
    left: GUTTER,
    right: GUTTER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewerCaption: { ...Type.label, color: Surface.default, flex: 1 },
});
