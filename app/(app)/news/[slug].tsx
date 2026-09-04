import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import {
  ArrowLeft,
  Calendar,
  User,
  PlayCircle, FileImage, Share2,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { ContentService } from "@/lib/content.service";
import { GlassCard } from "@/components/ui/GlassCard";
import type { NewsPost } from "@/types/content.types";

export default function NewsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    
    const load = async () => {
      try {
        const data = await ContentService.getNewsPost(slug);
        setPost(data);
      } catch (err) {
        console.error("Error loading post:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  const formatDate = (date?: string | null) => {
    if (!date) return "";
    const parsed = new Date(date);
    return parsed.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleYoutube = () => {
    if (post?.youtube_url) {
      Linking.openURL(post.youtube_url);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent.DEFAULT} />
        <Text style={styles.loadingText}>{"Chargement de l'article..."}</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Article introuvable.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={Colors.ink.DEFAULT} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{post.title}</Text>
        <Pressable style={styles.iconBtn}>
          <Share2 size={22} color={Colors.ink.DEFAULT} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {post.cover_image && (
          <View style={styles.coverContainer}>
            <ExpoImage
              source={{ uri: post.cover_image }}
              style={styles.coverImage}
              contentFit="cover"
            />
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={Colors.accent.DEFAULT} />
            <Text style={styles.metaText}>{formatDate(post.created_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <User size={14} color={Colors.accent.DEFAULT} />
            <Text style={styles.metaText}>{post.created_by_name || "Confrérie Yessal"}</Text>
          </View>
        </View>

        <Text style={styles.title}>{post.title}</Text>

        {post.excerpt ? (
          <View style={styles.excerptBox}>
            <Text style={styles.excerptText}>{post.excerpt}</Text>
          </View>
        ) : null}

        <View style={styles.contentBox}>
          <Text style={styles.contentText}>{post.content}</Text>
        </View>

        {post.youtube_url && (
          <Pressable style={styles.youtubeCard} onPress={handleYoutube}>
            <View style={styles.youtubeIcon}>
              <PlayCircle size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.youtubeTitle}>{"Vidéo de l'événement"}</Text>
              <Text style={styles.youtubeSubtitle}>Regarder sur YouTube</Text>
            </View>
          </Pressable>
        )}

        {post.gallery && post.gallery.length > 0 && (
          <View style={styles.gallerySection}>
            <View style={styles.gallerySectionHeader}><FileImage size={16} color={Colors.ink.faint} /><Text style={styles.sectionTitle}>Galerie Photos</Text></View>
            <View style={styles.galleryGrid}>
              {post.gallery.map((img) => (
                <View key={img.id} style={styles.galleryItem}>
                  <ExpoImage
                    source={{ uri: img.image }}
                    style={styles.galleryImage}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 16,
    color: Colors.ink.muted,
    fontFamily: "Inter_600SemiBold",
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: 12,
  },
  backBtnText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface.subtle,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    textAlign: "center",
    marginHorizontal: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingBottom: 40,
  },
  coverContainer: {
    width: "100%",
    height: 240,
    backgroundColor: Colors.surface.muted,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.faint,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    paddingHorizontal: 24,
    paddingTop: 12,
    lineHeight: 34,
  },
  excerptBox: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.accent.dim,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent.DEFAULT,
  },
  excerptText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    lineHeight: 22,
  },
  contentBox: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  contentText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 26,
  },
  youtubeCard: {
    marginHorizontal: 24,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FF0000",
    borderRadius: 20,
    gap: 16,
    shadowColor: "#FF0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  youtubeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  youtubeTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  youtubeSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  gallerySection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  gallerySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  galleryItem: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    backgroundColor: Colors.surface.muted,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
});



