import { useEffect, useMemo, useState } from "react";
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
import {
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  ChevronRight,
  Users,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { ContentService } from "@/lib/content.service";
import { useAuthStore } from "@/store/auth.store";
import type { Chat, Message } from "@/types/content.types";

const ADMIN_ROLES = ["admin", "chef_daara"];

type ChatSummary = Chat & {
  lastMessage?: Message;
  unread: number;
};

function chatLabel(chat: Chat) {
  if (chat.name) return chat.name;
  if (chat.daara_name) return chat.daara_name;
  if (chat.daara) return "Chat du Daara";
  return "Discussion";
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      const [chatData, messageData] = await Promise.all([
        ContentService.getChats(),
        ContentService.getMessages(),
      ]);
      setChats(chatData);
      setMessages(messageData);
    } catch {
      setChats([]);
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summaries = useMemo<ChatSummary[]>(() => {
    const latestByChat = new Map<number, Message>();
    [...messages]
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
      .forEach((msg) => {
        if (!latestByChat.has(msg.chat)) latestByChat.set(msg.chat, msg);
      });

    return chats
      .map((chat) => ({ ...chat, lastMessage: latestByChat.get(chat.id), unread: 0 }))
      .sort((a, b) => {
        if (a.daara && !b.daara) return -1;
        if (!a.daara && b.daara) return 1;
        const aTime = a.lastMessage ? new Date(a.lastMessage.sent_at).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.sent_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [chats, messages]);

  const filteredChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return summaries;
    return summaries.filter((chat) => {
      const name = chatLabel(chat);
      const content = chat.lastMessage?.content ?? "";
      return name.toLowerCase().includes(needle) || content.toLowerCase().includes(needle);
    });
  }, [query, summaries]);

  const daaraChats = filteredChats.filter((c) => c.daara);
  const otherChats = filteredChats.filter((c) => !c.daara);

  const handleNewGroup = () => {
    Alert.alert(
      "Nouveau groupe",
      "Fonctionnalité disponible depuis le tableau de bord web pour les administrateurs.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Messagerie"
        subtitle={isAdmin ? "Gérez les discussions de la communauté" : "Échangez avec votre Daara et vos frères"}
        icon={<MessageSquare size={24} color="#FFF" />}
        actions={isAdmin ? [
          {
            label: "Nouveau groupe",
            icon: <Plus size={20} color={Colors.ink.DEFAULT} />,
            onPress: handleNewGroup,
          },
        ] : []}
      />

      <View style={styles.content}>
        <View style={styles.searchBar}>
          <Input
            placeholder="Rechercher une discussion..."
            value={query}
            onChangeText={setQuery}
            icon={<Search size={16} color={Colors.ink.faint} />}
          />
        </View>

        {/* Admin indicator */}
        {isAdmin && (
          <View style={styles.adminBanner}>
            <ShieldCheck size={14} color={Colors.accent.DEFAULT} />
            <Text style={styles.adminBannerText}>
              {user?.role === "chef_daara" ? "Chef de Daara — vous gérez les messages de votre daara" : "Administrateur — vous gérez toutes les discussions"}
            </Text>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
              }}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
              <Text style={styles.loadingText}>Chargement des discussions…</Text>
            </View>
          ) : null}

          {!loading && filteredChats.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Users size={32} color={Colors.ink.faint} />
              <Text style={styles.emptyTitle}>Aucune discussion trouvée</Text>
              <Text style={styles.emptyText}>
                Essayez avec un autre mot-clé ou rafraîchissez.
              </Text>
            </GlassCard>
          ) : null}

          {!loading && daaraChats.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Mon Daara</Text>
              {daaraChats.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  isAdmin={isAdmin}
                  onPress={() => router.push(`/chat/${chat.id}` as any)}
                />
              ))}
            </>
          ) : null}

          {!loading && otherChats.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Discussions</Text>
              {otherChats.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  isAdmin={isAdmin}
                  onPress={() => router.push(`/chat/${chat.id}` as any)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function ChatRow({
  chat,
  isAdmin,
  onPress,
}: {
  chat: ChatSummary;
  isAdmin: boolean;
  onPress: () => void;
}) {
  const label = chatLabel(chat);
  const lastMessage = chat.lastMessage?.content ?? "Aucun message pour le moment.";
  const time = formatTime(chat.lastMessage?.sent_at);

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.chatCard}>
        <View style={styles.chatRow}>
          {/* Avatar / group icon */}
          <View style={styles.avatarWrap}>
            {chat.daara ? (
              <View style={styles.groupAvatar}>
                <ShieldCheck size={22} color={Colors.accent.DEFAULT} />
              </View>
            ) : (
              <Avatar name={label} size={50} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <View style={styles.chatNameRow}>
                <Text style={styles.chatName} numberOfLines={1}>{label}</Text>
                {chat.daara ? (
                  <View style={styles.daaraBadge}>
                    <Text style={styles.daaraBadgeText}>Daara</Text>
                  </View>
                ) : null}
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <ShieldCheck size={10} color={Colors.accent.DEFAULT} />
                  </View>
                )}
              </View>
              <Text style={styles.chatTime}>{time}</Text>
            </View>

            <View style={styles.chatFooter}>
              <Text style={styles.lastMsg} numberOfLines={1}>{lastMessage}</Text>
              {chat.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unread}</Text>
                </View>
              )}
            </View>
          </View>

          <ChevronRight size={16} color={Colors.ink.ghost} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchBar: {
    marginTop: 14,
    marginBottom: 8,
  },
  adminBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.accent.dim,
    marginBottom: 8,
  },
  adminBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent.DEFAULT,
    lineHeight: 16,
  },
  scroll: {
    paddingBottom: 120,
    paddingTop: 4,
    gap: 8,
  },
  loadingCard: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 4,
    marginTop: 6,
    marginBottom: 2,
  },
  chatCard: {
    padding: 14,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    // container for avatar or group icon
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${Colors.accent.DEFAULT}30`,
  },
  chatNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  chatName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    flex: 1,
  },
  daaraBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.accent.dim,
  },
  daaraBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adminBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  chatTime: {
    fontSize: 11,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
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
