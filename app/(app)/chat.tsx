import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  MessageSquare,
  ShieldCheck,
  Users,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { ContentService } from "@/lib/content.service";
import type { Chat, Message } from "@/types/content.types";

type ChatSummary = Chat & {
  lastMessage?: Message;
  unread: number;
};

function formatTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CommunityScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [chatData, messageData] = await Promise.all([
          ContentService.getChats(),
          ContentService.getMessages(),
        ]);

        if (!active) {
          return;
        }

        setChats(chatData);
        setMessages(messageData);
      } catch {
        if (active) {
          setChats([]);
          setMessages([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const summaries = useMemo<ChatSummary[]>(() => {
    const latestByChat = new Map<number, Message>();

    [...messages]
      .sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
      )
      .forEach((message) => {
        if (!latestByChat.has(message.chat)) {
          latestByChat.set(message.chat, message);
        }
      });

    return chats.map((chat) => ({
      ...chat,
      lastMessage: latestByChat.get(chat.id),
      unread: 0,
    }));
  }, [chats, messages]);

  const filteredChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return summaries;
    }

    return summaries.filter((chat) => {
      const name = chat.name ?? `Chat ${chat.id}`;
      const content = chat.lastMessage?.content ?? "";
      return (
        name.toLowerCase().includes(needle) ||
        content.toLowerCase().includes(needle)
      );
    });
  }, [query, summaries]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Communauté"
        subtitle="Échangez avec votre Daara et vos frères"
        icon={<MessageSquare size={24} color="#FFF" />}
      />

      <View style={styles.content}>
        <View style={styles.searchBar}>
          <Input
            placeholder="Rechercher une discussion..."
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
            </View>
          ) : null}

          {!loading && filteredChats.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucune discussion trouvée</Text>
              <Text style={styles.emptyText}>
                Essayez avec un autre mot-clé ou rafraîchissez.
              </Text>
            </GlassCard>
          ) : null}

          {filteredChats.map((chat) => {
            const lastMessage =
              chat.lastMessage?.content ?? "Aucun message pour le moment.";
            const time = formatTime(chat.lastMessage?.sent_at);
            const label = chat.name ?? `Chat ${chat.id}`;

            return (
              <Pressable
                key={chat.id}
                onPress={() => router.push(`/chat/${chat.id}` as any)}
              >
                <GlassCard style={styles.chatCard}>
                  <View style={styles.chatRow}>
                    <View style={styles.avatarWrap}>
                      <View style={styles.avatar}>
                        {chat.daara ? (
                          <ShieldCheck
                            size={22}
                            color={Colors.accent.DEFAULT}
                          />
                        ) : (
                          <Users size={22} color={Colors.ink.muted} />
                        )}
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.chatHeader}>
                        <Text style={styles.chatName}>{label}</Text>
                        <Text style={styles.chatTime}>{time}</Text>
                      </View>

                      <View style={styles.chatFooter}>
                        <Text style={styles.lastMsg} numberOfLines={1}>
                          {lastMessage}
                        </Text>
                        {chat.unread > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{chat.unread}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <ChevronRight size={18} color={Colors.ink.ghost} />
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    flex: 1,
    marginTop: 0,
    zIndex: 2,
    paddingHorizontal: 20,
  },
  searchBar: {
    marginBottom: 16,
  },
  scroll: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  loadingCard: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: 16,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
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
  chatCard: {
    marginBottom: 12,
    padding: 16,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    letterSpacing: -0.4,
  },
  chatTime: {
    fontSize: 11,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMsg: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
});
