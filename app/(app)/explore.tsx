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
  Settings2,
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

          {!loading && news.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/news/${item.slug}` as any)}>
              <GlassCard style={styles.newsCard}>
                {item.cover_image && (
                  <View style={styles.coverContainer}>
                    <ExpoImage 
                      source={{ uri: item.cover_image }} 
                      style={styles.coverImage} 
                      contentFit="cover"
                    />
                  </View>
                )}
                <View style={styles.cardHeader}>
                  <Badge label="Actualité" color={Colors.accent.DEFAULT} />
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={Colors.ink.faint} />
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>

                <Text style={styles.newsTitle}>{item.title}</Text>
                
                <Text style={styles.excerpt} numberOfLines={3}>
                  {item.excerpt || item.content.substring(0, 120) + "..."}
                </Text>

                {item.youtube_url && (
                  <View style={styles.youtubeButton}>
                    <View style={styles.youtubeIcon}>
                      <ChevronRight size={16} color="#FFF" />
                    </View>
                    <Text style={styles.youtubeText}>Vidéo YouTube disponible</Text>
                  </View>
                )}

                {item.gallery && item.gallery.length > 0 && (
                  <View style={styles.galleryPreview}>
                    {item.gallery.slice(0, 3).map((img) => (
                      <ExpoImage 
                        key={img.id} 
                        source={{ uri: img.image }} 
                        style={styles.galleryThumb} 
                      />
                    ))}
                    {item.gallery.length > 3 && (
                      <View style={[styles.galleryThumb, styles.galleryMore]}>
                        <Text style={styles.galleryMoreText}>+{item.gallery.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.footer}>
                  <View style={styles.authorRow}>
                    <User size={12} color={Colors.ink.faint} />
                    <Text style={styles.authorText}>{item.created_by_name || "Confrérie"}</Text>
                  </View>
                  <View style={styles.readMore}>
                    <Text style={styles.readMoreText}>Lire la suite</Text>
                    <ChevronRight size={14} color={Colors.accent.DEFAULT} />
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
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
  newsCard: {
    marginBottom: 20,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
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
  newsTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    lineHeight: 24,
  },
  excerpt: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(26, 92, 58, 0.05)",
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
  coverContainer: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    height: 180,
    backgroundColor: Colors.surface.muted,
  },
  coverImage: {
    width: "100%",
    height: "100%",
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
