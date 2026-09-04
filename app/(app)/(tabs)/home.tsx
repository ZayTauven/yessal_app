import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import {
  Bell,
  Heart,
  Landmark,
  MessageSquare,
  Settings2,
  UserCheck,
  Users,
} from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/auth.store";
import { ContentService } from "@/lib/content.service";
import type { AnalyticsResponse, NewsPost } from "@/types";

const COLLECTOR_ROLES = ["collector", "chef_daara", "admin"];

function roleLabel(role?: string) {
  switch (role) {
    case "admin": return "Administrateur";
    case "chef_daara": return "Chef de Daara";
    case "collector": return "Collecteur";
    case "member": return "Membre";
    case "tutelle": return "Tutelle";
    default: return "Membre";
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firstName = user?.first_name ?? "Membre";
  const isCollector = COLLECTOR_ROLES.includes(user?.role ?? "");

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
        if (active) setAnalytics(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const kpis = analytics?.kpis ?? [
    { title: "Mes Jëfs", value: "12", change: "+2 ce mois", icon: "HandCoins" },
    { title: "Ndiguels", value: "4", change: "En cours", icon: "Landmark" },
    { title: "Tutelles", value: "3", change: "Membres", icon: "Users" },
  ];

  const shortcuts = [
    { title: "Faire un Jëf", icon: Heart, route: "/donate" as any, color: Colors.accent.DEFAULT },
    { title: "Ndiguels", icon: Landmark, route: "/campaigns" as any, color: Colors.gold?.DEFAULT ?? "#B8860B" },
    { title: "Messagerie", icon: MessageSquare, route: "/chat" as any, color: "#3B82F6" },
    ...(isCollector ? [{ title: "Collecte physique", icon: UserCheck, route: "/donate" as any, color: "#8B5CF6" }] : []),
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
          subtitle={roleLabel(user?.role)}
          icon={
            <Avatar
              uri={user?.avatar_url ?? user?.avatar}
              name={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`}
              size={40}
              borderRadius={13}
            />
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

          {/* ─── Hero card premium ─── */}
          <View style={styles.heroWrap}>
            <GlassCard style={styles.heroCard}>
              {/* Arabesque décoration */}
              <ExpoImage
                source={require("@/assets/images/arabesque.png")}
                style={styles.heroArabesque}
                contentFit="contain"
                tintColor={Colors.accent.DEFAULT}
              />
              <ExpoImage
                source={require("@/assets/images/ornement.png")}
                style={styles.heroOrnament}
                contentFit="contain"
              />

              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>Yessal Gui</Text>
              </View>
              <Text style={styles.heroTitle}>Suivez vos Jëfs{"\n"}et vos Ndiguels.</Text>
              <Text style={styles.heroText}>
                Contribuez, consultez l'état de vos campagnes et restez connecté à votre communauté.
              </Text>
              <Button
                label="Faire un Jëf"
                onPress={() => router.push("/donate" as any)}
                icon={<Heart size={16} color="#FFF" />}
              />
            </GlassCard>
          </View>

          {/* ─── KPI cards ─── */}
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

          {/* ─── Raccourcis ─── */}
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
                  <View style={[styles.quickIcon, { backgroundColor: `${item.color}18` }]}>
                    <Icon size={18} color={item.color} />
                  </View>
                  <Text style={styles.quickTitle}>{item.title}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ─── Dernières actualités ─── */}
          <Text style={styles.sectionTitle}>Dernières actualités</Text>
          <View style={styles.newsList}>
            {news.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/news/${item.slug}` as any)}
              >
                <GlassCard style={styles.newsCard}>
                  {item.cover_image ? (
                    <ExpoImage
                      source={{ uri: item.cover_image }}
                      style={styles.newsCover}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={styles.newsBody}>
                    <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                    {item.excerpt ? (
                      <Text style={styles.newsExcerpt} numberOfLines={2}>{item.excerpt}</Text>
                    ) : null}
                    <Text style={styles.newsDate}>
                      {new Date(item.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
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
                style={styles.moreBtn}
                onPress={() => router.push("/explore" as any)}
              >
                <Text style={styles.moreBtnText}>Voir toutes les actualités →</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 0,
  },
  // ─── Hero ───
  heroWrap: {
    marginBottom: 18,
  },
  heroCard: {
    padding: 22,
    overflow: "hidden",
    gap: 12,
    position: "relative",
  },
  heroArabesque: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    opacity: 0.08,
  },
  heroOrnament: {
    position: "absolute",
    left: -10,
    bottom: -10,
    width: 80,
    height: 80,
    opacity: 0.06,
  },
  heroPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.accent.dim,
  },
  heroPillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  // ─── KPIs ───
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
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
    gap: 3,
  },
  metricValue: {
    fontSize: 22,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  metricChange: {
    fontSize: 10,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  // ─── Section titles ───
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 2,
  },
  // ─── Quick actions ───
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  quickCard: {
    width: "48%",
    borderRadius: 18,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    padding: 16,
    minHeight: 96,
    justifyContent: "space-between",
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
  // ─── News ───
  newsList: {
    gap: 10,
    paddingBottom: 12,
  },
  newsCard: {
    padding: 0,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 80,
  },
  newsCover: {
    width: 90,
    height: "100%",
    minHeight: 80,
    backgroundColor: Colors.surface.muted,
  },
  newsBody: {
    flex: 1,
    padding: 14,
    gap: 5,
    justifyContent: "center",
  },
  newsTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    lineHeight: 19,
  },
  newsExcerpt: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  newsDate: {
    fontSize: 10,
    color: Colors.ink.faint,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  emptyCard: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  moreBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  moreBtnText: {
    fontSize: 12,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
});
