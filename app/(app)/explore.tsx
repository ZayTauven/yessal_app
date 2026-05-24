import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  Newspaper,
  Bell,
  Calendar,
  User,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import type { NewsPost } from "@/types/content.types";

const FALLBACK_NEWS: NewsPost[] = [
  {
    id: 1,
    slug: "succes-grand-magal-2024",
    title: "Succès du Grand Magal 2024",
    excerpt: "Retour sur un événement historique pour notre confrérie.",
    content: "Le Grand Magal de cette année a réuni des millions de fidèles dans une ferveur exceptionnelle...",
    is_published: true,
    created_by_name: "Admin Yessal",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    slug: "nouveau-daara-diourbel",
    title: "Nouveau Daara à Diourbel",
    excerpt: "L'expansion de notre réseau continue pour mieux vous servir.",
    content: "Nous avons le plaisir d'annoncer l'ouverture d'un nouveau centre d'enseignement...",
    is_published: true,
    created_by_name: "Service Com",
    created_at: new Date().toISOString(),
  },
];

function formatDate(date?: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ActualitesScreen() {
  const router = useRouter();
  const [news, setNews] = useState<NewsPost[]>(FALLBACK_NEWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await ContentService.getNews();
        if (active && data.length > 0) {
          setNews(data);
        }
      } catch (err) {
        console.error("Error loading news:", err);
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

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Actualités"
        subtitle="Le journal de la confrérie"
        icon={<Newspaper size={24} color="#FFF" />}
        actions={[
          {
            label: "Notifications",
            icon: <Bell size={18} color={Colors.ink.DEFAULT} />,
            onPress: () => router.push("/notifications" as any),
          },
        ]}
      />

      <View style={styles.content}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
              <Text style={styles.loadingText}>Chargement des actualités…</Text>
            </View>
          ) : null}

          {/* ─── Hero: premier article ─── */}
          {!loading && news.length > 0 && (() => {
            const hero = news[0];
            return (
              <Pressable onPress={() => router.push(`/news/${hero.slug}` as any)}>
                <GlassCard style={styles.heroCard}>
                  <View style={styles.heroCoverWrap}>
                    {hero.cover_image ? (
                      <ExpoImage
                        source={{ uri: hero.cover_image }}
                        style={styles.heroCover}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.heroCoverFallback}>
                        <ExpoImage
                          source={require("@/assets/images/arabesque.png")}
                          style={styles.heroFallbackIllus}
                          contentFit="contain"
                          tintColor={Colors.accent.DEFAULT}
                        />
                      </View>
                    )}
                    <View style={styles.heroCoverOverlay} />
                    <View style={styles.heroPill}>
                      <Newspaper size={10} color="#FFF" />
                      <Text style={styles.heroPillText}>À la une</Text>
                    </View>
                  </View>

                  <View style={styles.heroBody}>
                    <View style={styles.heroMeta}>
                      <View style={styles.dateRow}>
                        <Calendar size={11} color={Colors.ink.faint} />
                        <Text style={styles.dateText}>{formatDate(hero.created_at)}</Text>
                      </View>
                      <View style={styles.authorRow}>
                        <User size={11} color={Colors.ink.faint} />
                        <Text style={styles.authorText}>{hero.created_by_name || "Confrérie"}</Text>
                      </View>
                    </View>

                    <Text style={styles.heroTitle}>{hero.title}</Text>
                    <Text style={styles.heroExcerpt} numberOfLines={3}>
                      {hero.excerpt || (hero.content ? hero.content.substring(0, 140) + "…" : "")}
                    </Text>

                    {hero.youtube_url && (
                      <View style={styles.youtubeButton}>
                        <View style={styles.youtubeIcon}>
                          <ChevronRight size={14} color="#FFF" />
                        </View>
                        <Text style={styles.youtubeText}>Vidéo disponible</Text>
                      </View>
                    )}

                    {Array.isArray(hero.gallery) && hero.gallery.length > 0 && (
                      <View style={styles.galleryPreview}>
                        {hero.gallery.slice(0, 3).map((img, idx) => (
                          <ExpoImage
                            key={img.id ?? idx}
                            source={{ uri: img.image }}
                            style={styles.galleryThumb}
                            contentFit="cover"
                          />
                        ))}
                        {hero.gallery.length > 3 && (
                          <View style={[styles.galleryThumb, styles.galleryMore]}>
                            <Text style={styles.galleryMoreText}>+{hero.gallery.length - 3}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.readMore}>
                      <Text style={styles.readMoreText}>Lire la suite</Text>
                      <ChevronRight size={14} color={Colors.accent.DEFAULT} />
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })()}

          {/* ─── Articles suivants : liste compacte ─── */}
          {!loading && news.length > 1 && (
            <>
              <Text style={styles.sectionLabel}>Autres actualités</Text>
              {news.slice(1).map((item) => (
                <Pressable key={item.id} onPress={() => router.push(`/news/${item.slug}` as any)}>
                  <GlassCard style={styles.compactCard}>
                    {item.cover_image ? (
                      <ExpoImage
                        source={{ uri: item.cover_image }}
                        style={styles.compactCover}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.compactCover, styles.compactCoverFallback]}>
                        <ExpoImage
                          source={require("@/assets/images/ornement.png")}
                          style={{ width: 32, height: 32, opacity: 0.3 }}
                          contentFit="contain"
                          tintColor={Colors.accent.DEFAULT}
                        />
                      </View>
                    )}
                    <View style={styles.compactBody}>
                      <Text style={styles.compactTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.compactDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.ink.faint} />
                  </GlassCard>
                </Pressable>
              ))}
            </>
          )}
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
    paddingHorizontal: 20,
  },
  scroll: {
    paddingBottom: 180,
    paddingTop: 16,
  },
  loadingCard: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
    marginLeft: 2,
  },
  // ─── Hero card ───
  heroCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: 20,
  },
  heroCoverWrap: {
    height: 220,
    position: "relative",
  },
  heroCover: {
    ...StyleSheet.absoluteFill,
  },
  heroCoverFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFallbackIllus: {
    width: 140,
    height: 140,
    opacity: 0.25,
  },
  heroCoverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(26, 92, 58, 0.35)",
  },
  heroPill: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.accent.DEFAULT,
  },
  heroPillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroBody: {
    padding: 16,
    gap: 10,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    lineHeight: 27,
  },
  heroExcerpt: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 21,
  },
  // ─── Compact card ───
  compactCard: {
    padding: 0,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 72,
  },
  compactCover: {
    width: 80,
    height: 72,
    backgroundColor: Colors.surface.muted,
  },
  compactCoverFallback: {
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  compactBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  compactTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    lineHeight: 19,
  },
  compactDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.faint,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.faint,
  },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  youtubeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF000010",
    padding: 10,
    borderRadius: 12,
    gap: 10,
    marginTop: 4,
  },
  youtubeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF0000",
    alignItems: "center",
    justifyContent: "center",
  },
  youtubeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#CC0000",
  },
  galleryPreview: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  galleryThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: Colors.surface.muted,
  },
  galleryMore: {
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.accent.DEFAULT,
  },
  galleryMoreText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
});
