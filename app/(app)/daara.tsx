import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Megaphone, RefreshCw, Settings2, TrendingUp, Users } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import type { AnalyticsResponse, Announcement } from "@/types/content.types";

export default function DaaraScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await ContentService.getAnalytics();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(
    () =>
      analytics?.kpis ?? [
        { title: "Membres", value: "0", change: "Synchronisation", icon: "Users" },
        { title: "Événements", value: "0", change: "Synchronisation", icon: "Calendar" },
        { title: "Dons", value: "0", change: "Synchronisation", icon: "HandCoins" },
      ],
    [analytics?.kpis],
  );

  const announcements = analytics?.announcements ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <SectionHeader
        title="Daara"
        subtitle={analytics?.daara ? `Vue d'ensemble de ${analytics.daara}` : "Vue d'ensemble de votre communauté"}
        icon={<Users size={24} color="#FFF" />}
        actions={[
          {
            label: "Notifications",
            icon: <Bell size={20} color={Colors.ink.DEFAULT} />,
            onPress: () => router.push("/notifications" as any),
          },
          {
            label: "Paramètres",
            icon: <Settings2 size={20} color={Colors.ink.DEFAULT} />,
            onPress: () => router.push("/profile" as any),
          },
        ]}
      />

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
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
          <GlassCard style={styles.introCard}>
            <Text style={styles.introTitle}>Gardez la vue sur votre Daara</Text>
            <Text style={styles.introText}>
              Les indicateurs et annonces proviennent désormais du backend pour garder une lecture
              cohérente de la communauté.
            </Text>
          </GlassCard>

          <Pressable style={styles.announcementButton} onPress={() => router.push("/announcements" as any)}>
            <Megaphone size={16} color={Colors.accent.DEFAULT} />
            <Text style={styles.announcementButtonText}>Voir toutes les annonces</Text>
          </Pressable>

          <Pressable
            style={styles.refreshButton}
            onPress={async () => {
              setRefreshing(true);
              await load();
            }}
          >
            <RefreshCw size={16} color={Colors.accent.DEFAULT} />
            <Text style={styles.refreshText}>Rafraîchir</Text>
          </Pressable>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
            </View>
          ) : null}

          <View style={styles.statsRow}>
            {kpis.slice(0, 3).map((item) => (
              <GlassCard key={item.title} style={styles.statCard}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.title}</Text>
                <Text style={styles.statChange}>{item.change}</Text>
              </GlassCard>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Annonces récentes</Text>
          <View style={styles.list}>
            {announcements.length > 0 ? (
              announcements.map((announcement: Announcement) => (
                <GlassCard key={announcement.id} style={styles.eventCard}>
                  <View style={styles.eventRow}>
                    <View style={styles.eventIcon}>
                      <Megaphone size={18} color={Colors.accent.DEFAULT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{announcement.title}</Text>
                      <Text style={styles.eventMeta} numberOfLines={2}>
                        {announcement.content}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            ) : (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucune annonce disponible pour le moment.</Text>
              </GlassCard>
            )}
          </View>

          <Text style={styles.sectionTitle}>Lecture rapide</Text>
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <TrendingUp size={18} color={Colors.accent.DEFAULT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>Données synchronisées</Text>
                <Text style={styles.summaryText}>
                  Les indicateurs affichés ici proviennent de l’endpoint analytics du backend.
                </Text>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    flex: 1,
    marginTop: 0,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 16,
    gap: 14,
  },
  introCard: {
    padding: 18,
    marginBottom: 4,
  },
  introTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  refreshText: {
    fontSize: 12,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  announcementButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  announcementButtonText: {
    fontSize: 12,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  loadingRow: {
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 14,
  },
  statValue: {
    fontSize: 20,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  statChange: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  list: {
    gap: 12,
  },
  eventCard: {
    padding: 16,
  },
  eventRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent.dim,
  },
  eventTitle: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
  eventMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  emptyCard: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  summaryCard: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryTitle: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
});
