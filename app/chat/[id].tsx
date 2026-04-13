import { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Send, ShieldCheck, Users } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import { useAuthStore } from "@/store/auth.store";
import type { Chat, Message } from "@/types/content.types";

function parseId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const chatId = parseId(params.id);
  const user = useAuthStore((state) => state.user);

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    try {
      const [chatData, messageData] = await Promise.all([
        ContentService.getChats(),
        ContentService.getMessages(),
      ]);
      setChats(chatData);
      setMessages(messageData.filter((message) => message.chat === chatId));
    } catch {
      setChats([]);
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const chat = useMemo(
    () => chats.find((item) => item.id === chatId) ?? null,
    [chatId, chats],
  );

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
    [messages],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const handleSend = async () => {
    if (!chatId || !content.trim()) {
      return;
    }

    setSending(true);
    try {
      const created = await ContentService.createMessage({
        chat: chatId,
        content: content.trim(),
      });

      setMessages((current) => [...current, created]);
      setContent("");
    } catch {
      Alert.alert("Erreur", "Impossible d’envoyer le message pour le moment.");
    } finally {
      setSending(false);
    }
  };

  const label = chat?.name ?? (chatId ? `Chat ${chatId}` : "Discussion");
  const initials = label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!chatId) {
    return (
      <View style={styles.screen}>
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Conversation introuvable</Text>
          <Text style={styles.errorText}>L’identifiant du chat est invalide.</Text>
          <Button label="Retour" onPress={() => router.back()} fullWidth={false} />
        </GlassCard>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={18} color={Colors.ink.DEFAULT} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{label}</Text>
            <Text style={styles.headerSubtitle}>
              {chat?.daara ? "Chat de Daara" : "Discussion communautaire"}
            </Text>
          </View>

          <View style={styles.avatar}>
            {chat?.daara ? (
              <ShieldCheck size={18} color={Colors.accent.DEFAULT} />
            ) : (
              <Users size={18} color={Colors.accent.DEFAULT} />
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Chargement de la conversation...</Text>
          </View>
        ) : (
        <ScrollView
          style={styles.messagesWrap}
          contentContainerStyle={styles.messagesContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentInsetAdjustmentBehavior="automatic"
          scrollIndicatorInsets={{ bottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
            <GlassCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarSmallText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>{label}</Text>
                  <Text style={styles.summaryText}>
                    Faites défiler pour lire les derniers messages et répondez dans le champ ci-dessous.
                  </Text>
                </View>
              </View>
            </GlassCard>

            {orderedMessages.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aucun message pour le moment</Text>
                <Text style={styles.emptyText}>
                  Cette conversation est prête à recevoir le premier message.
                </Text>
              </GlassCard>
            ) : null}

            {orderedMessages.map((message) => {
              const isMine = message.sender === user?.id;
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMine ? styles.bubbleMine : styles.bubbleOther,
                    ]}
                  >
                    <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                      {message.content}
                    </Text>
                    <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
                      {formatDateTime(message.sent_at)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <GlassCard style={styles.composerCard}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Écrire un message..."
            placeholderTextColor={Colors.ink.faint}
            multiline
            style={styles.composerInput}
          />
          <Button
            label={sending ? "Envoi..." : "Envoyer"}
            onPress={handleSend}
            loading={sending}
            icon={<Send size={16} color="#fff" />}
            fullWidth={false}
          />
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
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
    paddingBottom: 28,
    gap: 12,
  },
  summaryCard: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: {
    color: Colors.accent.DEFAULT,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  summaryTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  summaryText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  emptyCard: {
    padding: 16,
  },
  emptyTitle: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  bubbleMine: {
    backgroundColor: Colors.accent.DEFAULT,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    borderBottomLeftRadius: 6,
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
  messageTime: {
    fontSize: 10,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-end",
  },
  messageTimeMine: {
    color: "rgba(255,255,255,0.82)",
  },
  composerCard: {
    padding: 14,
    gap: 10,
    marginBottom: 2,
  },
  composerInput: {
    minHeight: 48,
    maxHeight: 120,
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
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
