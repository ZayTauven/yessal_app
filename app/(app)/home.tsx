import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, Heart, Landmark, Settings2, Sparkles, Megaphone } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuthStore } from "@/store/auth.store";
import { ContentService } from "@/lib/content.service";
import type { AnalyticsResponse, NewsPost } from "@/types";

const shortcuts = [
  { title: "Faire un Jëfs", icon: Heart, route: "/donate" as any },
  { title: "Ndiguels", icon: Landmark, route: "/campaigns" as any },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firstName = user?.first_name ?? "Membre";
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [analyticsData, newsData] = await Promise.all([
          ContentService.getAnalytics(),
          ContentService.getNews(),
        ]);
        if (active) {
          setAnalytics(analyticsData);
          setNews(newsData.slice(0, 3));
        }
      } catch {
        if (active) {
          setAnalytics(null);
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

  const kpis = analytics?.kpis ?? [
    { title: "Contributions", value: "12", change: "+2", icon: "HandCoins" },
    { title: "Ndiguels", value: "4", change: "Actives", icon: "Landmark" },
    { title: "Tutelles", value: "8", change: "Membres", icon: "Users" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: 120 }}
      >
        <SectionHeader
          title={`Salam, ${firstName}`}
          subtitle="Votre espace Yessal en un coup d'œil"
          icon={
            <View style={styles.headerIcon}>
              <Sparkles size={16} color="#FFF" />
            </View>
          }
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

        <View style={styles.body}>
          <Text style={styles.kicker}>Yessal Gui</Text>

          <GlassCard style={styles.heroCard}>
            <Text style={styles.heroTitle}>Suivez vos Jëfs et vos Ndiguels.</Text>
            <Text style={styles.heroText}>
              Accédez rapidement aux actions importantes et gardez une vue
              claire sur votre communauté.
            </Text>
            <Button
              label="Faire un Jëfs"
              onPress={() => router.push("/donate" as any)}
            />
          </GlassCard>

          <View style={styles.metricsRow}>
            {loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={Colors.accent.DEFAULT} />
              </View>
            ) : (
              kpis.slice(0, 3).map((item) => (
                <GlassCard key={item.title} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{item.value}</Text>
                  <Text style={styles.metricLabel}>{item.title}</Text>
                  <Text style={styles.metricChange}>{item.change}</Text>
                </GlassCard>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickGrid}>
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.title}
                  style={styles.quickCard}
                  onPress={() => router.push(item.route)}
                >
                  <View style={styles.quickIcon}>
                    <Icon size={18} color={Colors.accent.DEFAULT} />
                  </View>
                  <Text style={styles.quickTitle}>{item.title}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Dernières actualités</Text>
          <View style={styles.announcements}>
            {news.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/news/${item.slug}` as any)}
              >
                <GlassCard style={styles.announcementCard}>
                  <Text style={styles.announcementTitle}>{item.title}</Text>
                  <Text style={styles.announcementText} numberOfLines={2}>
                    {item.excerpt || item.content}
                  </Text>
                </GlassCard>
              </Pressable>
            ))}

            {!loading && news.length === 0 && (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucune actualité récente pour le moment.</Text>
              </GlassCard>
            )}

            {!loading && news.length > 0 ? (
              <Pressable
                style={styles.moreAnnouncements}
                onPress={() => router.push("/explore" as any)}
              >
                <Megaphone size={16} color={Colors.accent.DEFAULT} />
                <Text style={styles.moreAnnouncementsText}>Voir toutes les actualités</Text>
              </Pressable>
            ) : null}
          </View>
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
  content: {
    paddingBottom: 120,
  },
  body: {
    paddingHorizontal: 24,
    marginTop: 0,
    paddingTop: 16,
  },
  kicker: {
    color: Colors.accent.light,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accent.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    padding: 18,
    marginBottom: 18,
  },
  heroTitle: {
    color: Colors.ink.DEFAULT,
    fontSize: 22,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  heroText: {
    color: Colors.ink.muted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: "Inter_400Regular",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  loadingCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: 20,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  metricCard: {
    flex: 1,
    padding: 14,
  },
  metricValue: {
    fontSize: 20,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.ink.muted,
    marginTop: 6,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  metricChange: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    marginTop: 4,
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
  quickGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  quickCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    padding: 16,
    minHeight: 106,
    justifyContent: "space-between",
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
  announcements: {
    gap: 10,
    paddingBottom: 24,
  },
  announcementCard: {
    padding: 16,
    gap: 8,
  },
  announcementTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  announcementText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  emptyCard: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  moreAnnouncements: {
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
  moreAnnouncementsText: {
    fontSize: 12,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
});
