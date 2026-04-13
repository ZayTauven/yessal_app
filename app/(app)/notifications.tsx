import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, Heart, Megaphone, ShieldAlert, Sparkles } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import type { Announcement } from "@/types/content.types";

function urgencyLabel(value: Announcement["urgency"]) {
  switch (value) {
    case "critical":
      return "Critique";
    case "warning":
      return "À suivre";
    default:
      return "Info";
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await ContentService.getAnnouncements();
      setAnnouncements(data.filter((item) => item.is_published));
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const urgentAnnouncements = useMemo(
    () => announcements.filter((item) => item.urgency !== "info").slice(0, 3),
    [announcements],
  );

  const recentAnnouncements = useMemo(
    () =>
      [...announcements]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [announcements],
  );

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Notifications"
        subtitle="Vos signaux utiles au même endroit"
        icon={<Bell size={24} color="#FFF" />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          await load();
        }} />}
      >
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Sparkles size={16} color="#FFF" />
              </View>
              <Text style={styles.heroBadge}>Centralisation</Text>
            </View>
            <Text style={styles.heroTitle}>Tout ce qui mérite votre attention.</Text>
            <Text style={styles.heroText}>
              Les notifications combinent les annonces publiées, les rappels de communauté et les
              points d’action rapides.
            </Text>
          </GlassCard>

        <Text style={styles.sectionLabel}>Prioritaires</Text>
        <View style={styles.list}>
          {urgentAnnouncements.length > 0 ? (
            urgentAnnouncements.map((item) => (
              <GlassCard key={item.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <ShieldAlert size={18} color={Colors.accent.DEFAULT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardText} numberOfLines={2}>
                      {item.content}
                    </Text>
                  </View>
                  <Text style={styles.urgency}>{urgencyLabel(item.urgency)}</Text>
                </View>
                <Text style={styles.cardMeta}>
                  {item.daara_name ? item.daara_name : "Communauté"}
                </Text>
              </GlassCard>
            ))
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucune alerte prioritaire pour le moment.</Text>
            </GlassCard>
          )}
        </View>

        <Text style={styles.sectionLabel}>Dernières notifications</Text>
        <View style={styles.list}>
          {!loading && recentAnnouncements.length > 0 ? (
            recentAnnouncements.map((item) => (
              <GlassCard key={item.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Megaphone size={18} color={Colors.accent.DEFAULT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardText} numberOfLines={2}>
                      {item.content}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.cardMeta}>{urgencyLabel(item.urgency)}</Text>
                  <Text style={styles.cardMeta}>
                    {item.daara_name ? item.daara_name : "Communauté"}
                  </Text>
                </View>
              </GlassCard>
            ))
          ) : !loading ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucune notification récente.</Text>
            </GlassCard>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Accès rapides</Text>
        <View style={styles.quickRow}>
          <Pressable style={styles.quickCard} onPress={() => router.push("/profile" as any)}>
            <Heart size={18} color={Colors.accent.DEFAULT} />
            <Text style={styles.quickText}>Profil</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => router.push("/campaigns" as any)}>
            <Megaphone size={18} color={Colors.accent.DEFAULT} />
            <Text style={styles.quickText}>Campagnes</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 14,
  },
  heroCard: {
    padding: 18,
    gap: 10,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accent.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  heroText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
    marginLeft: 4,
  },
  list: {
    gap: 10,
  },
  card: {
    padding: 16,
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  cardText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  urgency: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  cardMeta: {
    fontSize: 11,
    color: Colors.ink.faint,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  emptyCard: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickCard: {
    flex: 1,
    minHeight: 92,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    justifyContent: "space-between",
  },
  quickText: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
});
