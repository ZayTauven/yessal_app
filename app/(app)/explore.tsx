/**
 * app/(app)/explore.tsx — les Actualités, passées au système (phase F).
 *
 * Écran hérité (§5.2) : tokens et composants, pas de refonte. Deux corrections
 * de fond en chemin.
 *
 * ── 🔴 Les deux articles inventés ───────────────────────────────────────────
 *
 * `FALLBACK_NEWS` posait « Succès du Grand Magal 2024 » et « Nouveau Daara à
 * Diourbel » **en dur**, signés « Admin Yessal » et « Service Com », datés du
 * jour, et affichés **sans le moindre avertissement** dès que l'appel échouait.
 * Contrairement aux fêtes, il n'y avait même pas de bandeau « hors-ligne » : un
 * membre lisait une actualité fabriquée en croyant lire le journal de la
 * confrérie. Et le titre était pressable — vers `/news/succes-grand-magal-2024`,
 * une impasse en 404.
 *
 * Remplacé par `ErrorState` et `EmptyState`.
 *
 * ── La mauvaise date ────────────────────────────────────────────────────────
 *
 * L'écran affichait `created_at`. Le serveur trie la liste sur `-published_at`
 * (`news/models.py:22`), champ que le type et le normalisateur oubliaient
 * depuis l'origine — corrigé en phase F. Un article rédigé en janvier et publié
 * en mars arrivait donc en tête, daté de janvier, au-dessus d'articles plus
 * récents en apparence : l'ordre et les dates se contredisaient.
 *
 * ── Ce qui reste tel quel ───────────────────────────────────────────────────
 *
 * La mention « Vidéo disponible » ne lance rien : `youtube_url` est bien servi,
 * mais aucun lecteur n'est embarqué et l'ouverture se fait depuis l'article.
 * C'est donc une **mention**, pas un bouton — elle n'a plus l'allure d'une
 * commande.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  Calendar,
  ChevronRight,
  Newspaper,
  PlayCircle,
  User,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { RemotePhoto } from "@/components/ui/RemotePhoto";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
/* Directement depuis `lib/html` : cet écran déshabille du texte, il ne rend
   rien de riche — inutile de lui faire tirer le rendeur. */
import { toPlainText } from "@/lib/html";
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

/**
 * La date éditoriale d'abord, la date de création en secours — un brouillon
 * n'a pas de `published_at` tant qu'il n'est pas publié.
 */
function articleDate(post: NewsPost) {
  const raw = post.published_at ?? post.created_at;
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function summary(post: NewsPost) {
  if (post.excerpt) return post.excerpt;
  /* `toPlainText` et non `content` brut : depuis l'éditeur riche, le corps
     d'un article est du HTML. Sans résumé, la carte affichait « <p>Le
     <strong>Magal</strong> de T… » — le balisage mangeait la moitié des 140
     caractères d'aperçu. */
  const text = toPlainText(post.content);
  if (!text) return "";
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

interface State {
  status: "loading" | "ready" | "failed";
  posts: NewsPost[];
}

async function fetchNews(): Promise<State> {
  try {
    return { status: "ready", posts: await ContentService.getNews() };
  } catch {
    return { status: "failed", posts: [] };
  }
}

export default function ActualitesScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", posts: [] });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNews().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchNews().then(setState);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchNews()
      .then(setState)
      .finally(() => setRefreshing(false));
  }, []);

  const [hero, ...rest] = state.posts;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Actualités"
        onBack={() => router.back()}
        right={{
          icon: <Bell size={20} color={Ink[900]} strokeWidth={1.5} />,
          accessibilityLabel: "Notifications",
          onPress: () => router.push("/notifications"),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Violet[500]}
          />
        }
      >
        {state.status === "loading" ? (
          <View style={styles.list}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : null}

        {state.status === "failed" ? (
          <ErrorState
            body="Le journal de la confrérie n'a pas pu être chargé."
            onRetry={reload}
          />
        ) : null}

        {state.status === "ready" && state.posts.length === 0 ? (
          <EmptyState
            picto={<Newspaper size={56} color={Violet[900]} strokeWidth={1.25} />}
            title="Aucune actualité pour l'instant"
            body="Les publications de la confrérie apparaîtront ici dès leur parution."
          />
        ) : null}

        {hero ? (
          <HeroArticle post={hero} onPress={() => router.push(`/news/${hero.slug}`)} />
        ) : null}

        {rest.length > 0 ? (
          <View style={styles.list}>
            <Text style={styles.sectionLabel}>Autres actualités</Text>
            {rest.map((post) => (
              <CompactArticle
                key={post.id}
                post={post}
                onPress={() => router.push(`/news/${post.slug}`)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroArticle({ post, onPress }: { post: NewsPost; onPress: () => void }) {
  const gallery = post.gallery ?? [];

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel={post.title} style={styles.hero}>
      <View style={styles.heroCover}>
        {post.cover_image ? (
          <ExpoImage
            source={{ uri: post.cover_image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <ExpoImage
              source={require("@/assets/images/arabesque.png")}
              style={styles.heroOrnament}
              contentFit="contain"
              tintColor={Violet[400]}
            />
          </View>
        )}
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>À LA UNE</Text>
        </View>
      </View>

      <View style={styles.heroBody}>
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Calendar size={11} color={Ink[300]} strokeWidth={1.5} />
            <Text style={styles.metaText}>{articleDate(post)}</Text>
          </View>
          {post.created_by_name ? (
            <View style={styles.meta}>
              <User size={11} color={Ink[300]} strokeWidth={1.5} />
              <Text style={styles.metaText}>{post.created_by_name}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.heroTitle}>{post.title}</Text>
        <Text style={styles.heroExcerpt} numberOfLines={3}>
          {summary(post)}
        </Text>

        {post.youtube_url ? (
          <View style={styles.videoNote}>
            <PlayCircle size={14} color={Violet[700]} strokeWidth={1.5} />
            <Text style={styles.videoNoteText}>Cet article contient une vidéo</Text>
          </View>
        ) : null}

        {gallery.length > 0 ? (
          <View style={styles.gallery}>
            {/* `RemotePhoto` : une vignette dont le fichier a disparu du
                serveur portait un carré gris sans un mot. */}
            {gallery.slice(0, 3).map((image, index) => (
              <RemotePhoto
                key={image.id ?? index}
                uri={image.image}
                accessibilityLabel={image.caption ?? `Photographie ${index + 1}`}
                fallbackIconSize={18}
                style={styles.thumb}
              />
            ))}
            {gallery.length > 3 ? (
              <View style={[styles.thumb, styles.thumbMore]}>
                <Text style={styles.thumbMoreText}>+{gallery.length - 3}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.readMore}>
          <Text style={styles.readMoreText}>Lire la suite</Text>
          <ChevronRight size={14} color={Violet[700]} strokeWidth={1.5} />
        </View>
      </View>
    </Card>
  );
}

function CompactArticle({ post, onPress }: { post: NewsPost; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={post.title}
      style={({ pressed }) => [styles.compact, pressed && styles.pressed]}
    >
      {post.cover_image ? (
        <ExpoImage
          source={{ uri: post.cover_image }}
          style={styles.compactCover}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.compactCover, styles.compactPlaceholder]}>
          <Newspaper size={20} color={Violet[400]} strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.compactBody}>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.compactDate}>{articleDate(post)}</Text>
      </View>
      <ChevronRight size={16} color={Ink[300]} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: 120,
    gap: Space.xl,
  },
  list: { gap: Space.md },
  sectionLabel: { ...UIType.badgeLabel, color: Ink[300], letterSpacing: 1 },

  hero: { overflow: "hidden" },
  heroCover: { height: 200 },
  heroPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  heroOrnament: { width: 140, height: 140, opacity: 0.35 },
  heroPill: {
    position: "absolute",
    top: Space.md,
    left: Space.md,
    paddingHorizontal: Space.md,
    paddingVertical: 5,
    borderRadius: Radius.chip,
    backgroundColor: Violet[300],
  },
  heroPillText: { ...UIType.badgeLabel, color: Violet[900], letterSpacing: 0.5 },
  heroBody: { padding: Space.xl, gap: Space.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Space.lg },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { ...Type.micro, color: Ink[300] },
  heroTitle: { ...Type.cardTitle, fontSize: 20, lineHeight: 26, color: Ink[900] },
  heroExcerpt: { ...Type.body, color: Ink[500] },

  videoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: Violet[100],
    borderRadius: Radius.input,
    ...continuous,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    alignSelf: "flex-start",
  },
  videoNoteText: { ...Type.label, color: Violet[900] },

  gallery: { flexDirection: "row", gap: Space.sm },
  thumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Space.md,
    ...continuous,
    backgroundColor: Surface.alt,
  },
  thumbMore: {
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  thumbMoreText: { ...UIType.chipLabel, color: Violet[900] },

  readMore: { flexDirection: "row", alignItems: "center", gap: Space.xs },
  readMoreText: { ...UIType.chipLabel, color: Violet[700] },

  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingRight: Space.lg,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Surface.alt,
    overflow: "hidden",
  },
  compactCover: { width: 80, height: 76, backgroundColor: Violet[100] },
  compactPlaceholder: { alignItems: "center", justifyContent: "center" },
  compactBody: { flex: 1, paddingVertical: Space.md, gap: 4 },
  compactTitle: { ...UIType.personName, color: Ink[900] },
  compactDate: { ...Type.micro, color: Ink[300] },
  pressed: { opacity: 0.72 },
});
