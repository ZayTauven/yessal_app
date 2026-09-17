/**
 * app/(app)/news/[slug].tsx — l'article, passé au système (phase F).
 *
 * Écran hérité (§5.2). Trois corrections en chemin.
 *
 * ── Le bouton de partage ne partageait rien ─────────────────────────────────
 *
 * `<Pressable style={styles.iconBtn}><Share2 /></Pressable>` — **sans
 * `onPress`**. Il occupait 44 px en tête d'écran et ne faisait rien depuis
 * l'origine.
 *
 * Il partage maintenant le **titre et le chapô en texte**, pas un lien : il
 * n'existe aucune adresse web publique pour un article — `Config` ne connaît
 * que l'API — et fabriquer une URL qui n'ouvre rien serait remplacer un bouton
 * muet par un bouton menteur.
 *
 * ── La mauvaise date ────────────────────────────────────────────────────────
 *
 * `created_at` au lieu de `published_at` : voir `explore.tsx` et le
 * commentaire de `NewsPost`.
 *
 * ── L'auteur inventé ────────────────────────────────────────────────────────
 *
 * `post.created_by_name || "Confrérie Yessal"` attribuait à la confrérie tout
 * article dont l'auteur est inconnu — et `created_by` est `SET_NULL`, donc le
 * cas arrive dès qu'un compte de rédaction est supprimé. La ligne disparaît
 * plutôt que de signer à la place de quelqu'un.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar,
  FileImage,
  Newspaper,
  PlayCircle,
  Share2,
  User,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { RemotePhoto } from "@/components/ui/RemotePhoto";
import { RichText, toPlainText } from "@/components/ui/RichText";
import { ApiError } from "@/lib/api";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import type { NewsPost } from "@/types/content.types";
import {
  GUTTER,
  Ink,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

function formatDate(raw?: string | null) {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type State =
  | { status: "loading" }
  | { status: "ready"; post: NewsPost }
  /** `missing` : le serveur a répondu, l'article n'existe pas. */
  | { status: "missing" }
  /** `failed` : on n'a pas pu joindre le serveur. Les deux ne se disent pas pareil. */
  | { status: "failed" };

export default function NewsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (): Promise<State> => {
    if (!slug) return { status: "missing" };
    try {
      return { status: "ready", post: await ContentService.getNewsPost(slug) };
    } catch (error) {
      /** Un 404 n'est pas une panne : l'article a été retiré, on le dit. */
      const notFound = error instanceof ApiError && error.status === 404;
      return notFound ? { status: "missing" } : { status: "failed" };
    }
  }, [slug]);

  useEffect(() => {
    let active = true;
    load().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    load().then(setState);
  }, [load]);

  const post = state.status === "ready" ? state.post : null;

  const share = useCallback(() => {
    if (!post) return;
    /* `toPlainText` : depuis l'éditeur riche, `content` est du HTML. Découpé
       brut, le partage envoyait « <p>Le <strong>Magal</str… » par WhatsApp. */
    const raw = post.excerpt ?? toPlainText(post.content);
    const body = raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
    Share.share({ message: body ? `${post.title}\n\n${body}` : post.title });
  }, [post]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title={post?.title ?? "Actualité"}
        onBack={() => router.back()}
        right={
          post
            ? {
                icon: <Share2 size={20} color={Ink[900]} strokeWidth={1.5} />,
                accessibilityLabel: "Partager cet article",
                onPress: share,
              }
            : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {state.status === "loading" ? (
          <View style={styles.loading}>
            <Skeleton height={200} radius={Radius.card} />
            <Skeleton height={28} width="80%" />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} width="60%" />
          </View>
        ) : null}

        {state.status === "failed" ? (
          <ErrorState body="Cet article n'a pas pu être chargé." onRetry={retry} />
        ) : null}

        {state.status === "missing" ? (
          <EmptyState
            picto={<Newspaper size={56} color={Violet[900]} strokeWidth={1.25} />}
            title="Article introuvable"
            body="Il a peut-être été retiré depuis que le lien a été partagé."
            actionLabel="Voir les actualités"
            onAction={() => router.replace("/explore")}
          />
        ) : null}

        {post ? <Article post={post} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Article({ post }: { post: NewsPost }) {
  const gallery = post.gallery ?? [];
  const date = formatDate(post.published_at ?? post.created_at);

  return (
    <>
      {post.cover_image ? (
        <ExpoImage
          source={{ uri: post.cover_image }}
          style={styles.cover}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      <View style={styles.metaRow}>
        {date ? (
          <View style={styles.meta}>
            <Calendar size={13} color={Ink[300]} strokeWidth={1.5} />
            <Text style={styles.metaText}>{date}</Text>
          </View>
        ) : null}
        {/* Pas de signature de repli : voir l'en-tête du fichier. */}
        {post.created_by_name ? (
          <View style={styles.meta}>
            <User size={13} color={Ink[300]} strokeWidth={1.5} />
            <Text style={styles.metaText}>{post.created_by_name}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title}>{post.title}</Text>

      {post.excerpt ? (
        <View style={styles.excerpt}>
          <Text style={styles.excerptText}>{post.excerpt}</Text>
        </View>
      ) : null}

      {/* Le corps était un `<Text>` unique : correct tant que `content` était
          du texte, illisible depuis qu'il porte du balisage. <RichText> rend
          les deux — il reconnaît un article d'avant l'éditeur et le laisse
          tel quel. */}
      <RichText content={post.content} />

      {post.youtube_url ? (
        <Card
          onPress={() => Linking.openURL(post.youtube_url as string)}
          accessibilityLabel="Regarder la vidéo sur YouTube"
          style={styles.video}
        >
          <View style={styles.videoIcon}>
            <PlayCircle size={22} color={Violet[900]} strokeWidth={1.5} />
          </View>
          <View style={styles.videoText}>
            <Text style={styles.videoTitle}>Vidéo de l&apos;événement</Text>
            <Text style={styles.videoSubtitle}>Ouvrir sur YouTube</Text>
          </View>
        </Card>
      ) : null}

      {gallery.length > 0 ? (
        <View style={styles.gallery}>
          <View style={styles.galleryHeader}>
            <FileImage size={16} color={Ink[300]} strokeWidth={1.5} />
            <Text style={styles.galleryTitle}>Galerie</Text>
          </View>
          <View style={styles.galleryGrid}>
            {/* Pas de `Pressable` : aucune visionneuse plein écran n'existe,
                et une vignette qui s'enfonce sous le doigt sans rien ouvrir
                promet un agrandissement qui ne viendra pas.

                `RemotePhoto` et non `ExpoImage` : trois des lignes de galerie
                en base pointent vers des fichiers absents du disque, et une
                image morte se rendait ici en carré gris muet. Voir l'en-tête du
                composant. */}
            {gallery.map((image, index) => (
              <RemotePhoto
                key={image.id ?? index}
                uri={image.image}
                accessibilityLabel={image.caption ?? `Photographie ${index + 1}`}
                fallbackIconSize={26}
                style={styles.galleryItem}
              />
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: Space.huge,
    gap: Space.lg,
  },
  loading: { gap: Space.md },

  cover: {
    width: "100%",
    height: 220,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Surface.alt,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Space.lg },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { ...Type.micro, color: Ink[300] },

  title: { ...Type.screenTitle, fontSize: 26, lineHeight: 32, color: Ink[900] },
  excerpt: {
    backgroundColor: Surface.alt,
    borderLeftWidth: 3,
    borderLeftColor: Violet[300],
    borderRadius: Radius.input,
    ...continuous,
    padding: Space.lg,
  },
  excerptText: { ...Type.body, color: Violet[900] },

  video: { flexDirection: "row", alignItems: "center", gap: Space.md },
  videoIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  videoText: { flex: 1, gap: 2 },
  videoTitle: { ...UIType.rowTitle, color: Ink[900] },
  videoSubtitle: { ...Type.label, color: Ink[500] },

  gallery: { gap: Space.md },
  galleryHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  galleryTitle: { ...UIType.chipLabel, color: Ink[500] },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  galleryItem: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: Radius.input,
    ...continuous,
    overflow: "hidden",
    backgroundColor: Surface.alt,
  },
});
