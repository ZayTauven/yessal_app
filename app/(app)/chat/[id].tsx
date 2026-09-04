import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Image as ImageIcon, Send, ShieldCheck, Trash2 } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ContentService } from "@/lib/content.service";
import { useAuthStore } from "@/store/auth.store";
import type { Chat, Message } from "@/types/content.types";

const ADMIN_ROLES = ["admin", "chef_daara"];

function parseId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const chatId = parseId(params.id);
  const user = useAuthStore((state) => state.user);
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");
  const scrollRef = useRef<ScrollView>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!chatId) { setLoading(false); return; }
    try {
      const [chatData, messageData] = await Promise.all([
        ContentService.getChats(),
        ContentService.getMessages(),
      ]);
      setChats(chatData);
      setMessages(messageData.filter((m) => m.chat === chatId));
    } catch {
      setChats([]);
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [chatId]);

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const chat = useMemo(() => chats.find((c) => c.id === chatId) ?? null, [chatId, chats]);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
    [messages],
  );

  const handleSend = async () => {
    if (!chatId || !content.trim()) return;
    setSending(true);
    try {
      const created = await ContentService.createMessage({ chat: chatId, content: content.trim() });
      setMessages((curr) => [...curr, created]);
      setContent("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer le message pour le moment.");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (messageId: number) => {
    Alert.alert(
      "Supprimer ce message",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            setMessages((curr) => curr.filter((m) => m.id !== messageId));
          },
        },
      ]
    );
  };

  const chatLabel = chat?.name ?? chat?.daara_name ?? (chat?.daara ? "Chat du Daara" : "Discussion");

  if (!chatId) {
    return (
      <View style={styles.screen}>
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Conversation introuvable</Text>
          <Text style={styles.errorText}>L'identifiant est invalide.</Text>
          <Button label="Retour" onPress={() => router.back()} fullWidth={false} />
        </GlassCard>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={18} color={Colors.ink.DEFAULT} />
        </Pressable>

        {chat?.daara ? (
          <View style={styles.groupAvatarHeader}>
            <ShieldCheck size={20} color={Colors.accent.DEFAULT} />
          </View>
        ) : (
          <Avatar name={chatLabel} size={42} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatLabel}</Text>
          <Text style={styles.headerSubtitle}>
            {chat?.daara
              ? (chat.daara_name ? `Daara · ${chat.daara_name}` : "Chat de Daara")
              : "Discussion communautaire"}
          </Text>
        </View>

        {isAdmin && (
          <View style={styles.adminChip}>
            <ShieldCheck size={12} color={Colors.accent.DEFAULT} />
            <Text style={styles.adminChipText}>Admin</Text>
          </View>
        )}
      </View>

      {/* ─── Messages ─── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messagesWrap}
          contentContainerStyle={styles.messagesContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); }} />}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {orderedMessages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Aucun message</Text>
              <Text style={styles.emptyText}>Cette conversation est prête à recevoir le premier message.</Text>
            </View>
          ) : null}

          {orderedMessages.map((msg, index) => {
            const senderId = typeof msg.sender === "object" ? (msg.sender as any)?.id : msg.sender;
            const senderDisplay = typeof msg.sender === "object"
              ? ((msg.sender as any)?.name ?? (msg.sender as any)?.first_name ?? `Membre #${senderId}`)
              : `Membre #${msg.sender}`;
            const isMine = senderId === user?.id;
            const prevMsg = index > 0 ? orderedMessages[index - 1] : null;
            const prevSenderId = prevMsg ? (typeof prevMsg.sender === "object" ? (prevMsg.sender as any)?.id : prevMsg.sender) : null;
            const sameAuthor = prevSenderId === senderId;
            const showSenderName = !isMine && !sameAuthor;

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isMine ? styles.messageRowMine : styles.messageRowOther,
                  sameAuthor && styles.messageRowCompact,
                ]}
              >
                {/* Other's avatar (only on first message of a run) */}
                {!isMine && !sameAuthor ? (
                  <Avatar name={senderDisplay} size={30} style={styles.messageAvatar} />
                ) : !isMine ? (
                  <View style={styles.messageAvatarPlaceholder} />
                ) : null}

                <View style={[styles.messageGroup, isMine && styles.messageGroupMine]}>
                  {showSenderName && (
                    <Text style={styles.senderName}>{senderDisplay}</Text>
                  )}
                  <Pressable
                    onLongPress={isAdmin ? () => handleDeleteMessage(msg.id) : undefined}
                    style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                  >
                    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                      <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                        {msg.content}
                      </Text>
                      <View style={styles.messageMeta}>
                        <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
                          {formatTime(msg.sent_at)}
                        </Text>
                        {isAdmin && !isMine && (
                          <Pressable
                            onPress={() => handleDeleteMessage(msg.id)}
                            style={styles.deleteBtn}
                          >
                            <Trash2 size={11} color={Colors.status?.error ?? "#8B2E2E"} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ─── Composer ─── */}
      <View style={styles.composerWrap}>
        <GlassCard style={styles.composer}>
          <Pressable style={styles.attachBtn}>
            <ImageIcon size={18} color={Colors.ink.faint} />
          </Pressable>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Écrire un message…"
            placeholderTextColor={Colors.ink.faint}
            multiline
            style={styles.composerInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !content.trim()}
            style={[styles.sendBtn, (!content.trim() || sending) && styles.sendBtnDisabled]}
          >
            <Send size={17} color="#FFF" />
          </Pressable>
        </GlassCard>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 58 : 16,
    paddingBottom: 14,
    backgroundColor: Colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface.subtle,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarHeader: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${Colors.accent.DEFAULT}30`,
  },
  headerTitle: {
    fontSize: 16,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  adminChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.accent.dim,
  },
  adminChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  messagesWrap: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 2,
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageRowCompact: {
    marginBottom: 1,
  },
  messageAvatar: {
    marginBottom: 2,
    flexShrink: 0,
  },
  messageAvatarPlaceholder: {
    width: 30,
    flexShrink: 0,
  },
  messageGroup: {
    maxWidth: "76%",
    gap: 2,
  },
  messageGroupMine: {
    alignItems: "flex-end",
  },
  senderName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.faint,
    marginLeft: 4,
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: Colors.accent.DEFAULT,
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_400Regular",
  },
  messageTextMine: {
    color: "#FFF",
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  messageTimeMine: {
    color: "rgba(255,255,255,0.7)",
  },
  deleteBtn: {
    padding: 2,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 14,
    paddingTop: 8,
    backgroundColor: Colors.surface.DEFAULT,
    borderTopWidth: 1,
    borderTopColor: Colors.border.DEFAULT,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 8,
    paddingLeft: 12,
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surface.subtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  composerInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_400Regular",
    paddingVertical: 6,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.accent.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.ink.ghost,
  },
  errorCard: {
    padding: 18,
    gap: 10,
    margin: 20,
  },
  errorTitle: {
    fontSize: 16,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
});
