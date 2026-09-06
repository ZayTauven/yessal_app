/**
 * app/(app)/(tabs)/home.tsx — l'accueil.
 *
 * Planche « Accueil et Onglets », état plein et état vide.
 *
 * Quatre blocs, dans cet ordre :
 *   1. l'en-tête — bouton de tiroir, salutation, notifications, avatar ;
 *   2. « Ndiguels en cours » — un rail horizontal de cartes 288 × 212 ;
 *   3. « Vos tutelles » — les visages portés, plus une pastille d'ajout ;
 *   4. « Actualités du Daara » — une ligne par article.
 *
 * CE QUI A DISPARU de l'ancien accueil : les trois KPI chiffrés, la rangée de
 * raccourcis colorés et le héros à arabesques. Aucun n'est sur la planche.
 * Le mot d'ordre du brief est « à arbitrage égal entre ajouter et retirer,
 * retirer » — et un talibé qui ouvre l'application veut voir les appels en
 * cours, pas un tableau de bord.
 *
 * ⚠ LES MONTANTS SONT MASQUÉS POUR LES TALIBÉS. La carte du rail ne montre ni
 * somme ni pourcentage à un membre : elle montre qui participe. C'est la règle
 * de rôle du brief, portée par `CampaignCard`.
 *
 * ⚠ Le bouton « Faire un Jëf » de la carte est pleine largeur DANS UN RAIL QUI
 * DÉFILE (§3.3 du plan). Laissé tel que dessiné : `Pressable` cède le geste au
 * `ScrollView` dès que le doigt bouge, donc tapoter contribue et glisser fait
 * défiler. **À confirmer sur appareil** — c'est la vérification que le §3.3
 * demandait avant de figer.
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Menu, Newspaper, PiggyBank, Plus } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { Skeleton, SkeletonCampaignCard } from "@/components/ui/Skeleton";
import { TAB_BAR_SPACE } from "@/components/navigation/TabBar";
import { campaignVisual } from "@/lib/campaign-visuals";
import { canSeeAmounts } from "@/lib/roles";
import { ContentService } from "@/lib/content.service";
import { formatCountdown, formatFCFA, formatPercent } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import type { Campaign } from "@/types/campaign.types";
import type { NewsPost, Tutelle } from "@/types/content.types";
import {
  Font,
  GUTTER,
  Ink,
  Radius,
  ScrimPhoto,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
  noTouch,
  passThrough,
} from "@/theme";
import { LinearGradient } from "expo-linear-gradient";

/** Carte du rail — dimensions du contrat. */
const RAIL_CARD_WIDTH = 288;
const RAIL_CARD_HEIGHT = 212;
const RAIL_GAP = Space.md;

interface HomeState {
  status: "loading" | "ready" | "failed";
  campaigns: Campaign[];
  tutelles: Tutelle[];
  news: NewsPost[];
}

/** ⚠ Pas de `as const` : il figerait les tableaux en `readonly`. Même piège
 *  que `fontVariant` dans `theme/tokens.ts`. */
const EMPTY: Omit<HomeState, "status"> = { campaigns: [], tutelles: [], news: [] };

/**
 * Les trois appels partent ensemble : sur une 3G intermittente, les enchaîner
 * triplerait l'attente. Un seul échec fait basculer l'écran en erreur — c'est
 * volontaire, un accueil à moitié chargé ment sur l'état du Daara.
 */
async function fetchHome(): Promise<HomeState> {
  try {
    const [campaigns, tutelles, news] = await Promise.all([
      ContentService.getCampaigns(),
      ContentService.getTutelles(),
      ContentService.getNews(),
    ]);
    return {
      status: "ready",
      campaigns: campaigns.filter((c) => c.status === "active").slice(0, 6),
      tutelles,
      news: news.slice(0, 3),
    };
  } catch {
    return { status: "failed", ...EMPTY };
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const openDrawer = useUiStore((state) => state.openDrawer);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  /**
   * Un seul état plutôt que cinq. Deux raisons :
   *   — trois `setState` de suite provoquaient trois rendus pour un seul
   *     chargement ;
   *   — le React Compiler (`reactCompiler: true`) refuse un `setState`
   *     synchrone dans le corps d'un effet. Ici il vit APRÈS l'`await`, donc
   *     hors du chemin synchrone.
   */
  const [state, setState] = useState<HomeState>({ status: "loading", ...EMPTY });
  const [refreshing, setRefreshing] = useState(false);
  const [railIndex, setRailIndex] = useState(0);

  const showsAmounts = canSeeAmounts(user?.role);
  const firstName = user?.first_name ?? "Membre";

  useEffect(() => {
    let active = true;
    fetchHome().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setState(await fetchHome());
    setRefreshing(false);
  }, []);

  const { status } = state;
  const loading = status === "loading";
  const failed = status === "failed";
  const { campaigns, tutelles, news } = state;
  const completion = useProfileCompletion();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_BAR_SPACE + Space.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Violet[500]} />
        }
      >
        <View style={styles.header}>
          <IconButton
            icon={<Menu size={20} color={Ink[900]} strokeWidth={1.6} />}
            onPress={openDrawer}
            accessibilityLabel="Ouvrir le menu"
          />
          <View style={styles.greeting}>
            <Text style={styles.salutation}>Jamm ak salaam</Text>
            <Text style={styles.name} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          <View>
            <IconButton
              icon={<Bell size={20} color={Ink[900]} strokeWidth={1.5} />}
              onPress={() => router.push("/notifications")}
              accessibilityLabel="Notifications"
            />
            <Dot size={9} ringed style={styles.bellDot} />
          </View>
          <Pressable
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Mon profil"
          >
            <Avatar
              uri={user?.avatar_url ?? user?.avatar}
              name={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`}
            />
          </Pressable>
        </View>

        {/*
          L'alerte de profil incomplet — règle de produit Yessal, déjà tenue par
          `front-web`. Posée juste sous l'en-tête : c'est le premier écran de
          chaque session, et elle disparaît d'elle-même une fois le profil
          rempli. Voir `lib/profile-completion.ts`.
        */}
        <ProfileCompletionBanner state={completion} />

        {loading ? (
          <HomeSkeleton />
        ) : failed ? (
          <ErrorState
            body="Les Ndiguels n'ont pas pu être chargés."
            onRetry={refresh}
            style={styles.gutter}
          />
        ) : campaigns.length === 0 ? (
          <EmptyState
            picto={<PiggyBank size={56} color={Violet[900]} strokeWidth={1.5} />}
            title="Aucun Ndiguel pour l'instant"
            body="Votre Daara n'a pas encore lancé d'appel. Vous serez prévenu dès qu'un Ndiguel s'ouvre."
            card={false}
            style={[styles.gutter, styles.emptyHome]}
          />
        ) : (
          <View style={styles.section}>
            <SectionTitle
              title="Ndiguels en cours"
              actionLabel="Tout voir"
              onAction={() => router.push("/campaigns")}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={RAIL_CARD_WIDTH + RAIL_GAP}
              decelerationRate="fast"
              contentContainerStyle={styles.rail}
              onMomentumScrollEnd={(e) =>
                setRailIndex(
                  Math.round(
                    e.nativeEvent.contentOffset.x / (RAIL_CARD_WIDTH + RAIL_GAP),
                  ),
                )
              }
            >
              {campaigns.map((campaign) => (
                <RailCard
                  key={campaign.id}
                  campaign={campaign}
                  showsAmounts={showsAmounts}
                  onOpen={() => router.push(`/campaign/${campaign.id}`)}
                  onDonate={() =>
                    router.push({
                      pathname: "/donate",
                      params: { campaign: String(campaign.id) },
                    })
                  }
                />
              ))}
            </ScrollView>

            {campaigns.length > 1 ? (
              <View style={styles.dots}>
                {campaigns.map((campaign, i) => (
                  <View
                    key={campaign.id}
                    style={[styles.dot, i === railIndex && styles.dotActive]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}

        {!loading && !failed ? (
          <>
            <View style={[styles.section, styles.gutter]}>
              <SectionTitle
                title="Vos tutelles"
                actionLabel="Gérer"
                onAction={() => router.push("/profile/tutelle")}
              />
              <View style={styles.tutelles}>
                {tutelles.slice(0, 3).map((tutelle) => (
                  <Pressable
                    key={tutelle.id}
                    onPress={() => router.push("/profile/tutelle")}
                    accessibilityRole="button"
                    style={styles.tutelle}
                  >
                    <Avatar
                      uri={tutelle.avatar_url}
                      name={`${tutelle.first_name} ${tutelle.last_name}`}
                      size={56}
                    />
                    <Text style={styles.tutelleName} numberOfLines={1}>
                      {tutelle.first_name}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  onPress={() => router.push("/profile/tutelle")}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter une tutelle"
                  style={styles.tutelle}
                >
                  <View style={styles.addTutelle}>
                    <Plus size={20} color={Violet[700]} strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.tutelleName, styles.addTutelleName]}>Ajouter</Text>
                </Pressable>
              </View>
            </View>

            {news.length > 0 ? (
              <View style={[styles.section, styles.gutter]}>
                <SectionTitle title="Actualités du Daara" />
                {news.map((post) => (
                  <Card
                    key={post.id}
                    padded={false}
                    onPress={() => router.push(`/news/${post.slug}`)}
                    accessibilityLabel={post.title}
                    style={styles.newsCard}
                  >
                    {post.cover_image ? (
                      <ExpoImage
                        source={{ uri: post.cover_image }}
                        style={styles.newsCover}
                        contentFit="cover"
                      />
                    ) : (
                      /* Violet-100 seul se lisait comme un trou sur fond blanc. */
                      <View style={[styles.newsCover, styles.newsCoverEmpty]}>
                        <Newspaper size={24} color={Violet[300]} strokeWidth={1.5} />
                      </View>
                    )}
                    <View style={styles.newsText}>
                      <Text style={styles.newsTitle} numberOfLines={2}>
                        {post.title}
                      </Text>
                      {/* `published_at` d'abord : c'est la date sur laquelle le
                          serveur trie la liste (`news/models.py:22`). Voir le
                          commentaire de `NewsPost` — le champ manquait au type
                          jusqu'à la phase F, et l'accueil datait donc les
                          articles de leur rédaction, pas de leur parution. */}
                      <Text style={styles.newsMeta}>
                        {relativeTime(post.published_at ?? post.created_at)}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleLabel}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={12}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * La carte du rail. Ce n'est pas `CampaignCard` : celle du contrat fait 200 de
 * haut, pleine largeur, sans bouton. Celle-ci fait 288 × 212 et porte le CTA.
 * Deux formats, deux composants — les fusionner aurait donné une carte à
 * options.
 */
function RailCard({
  campaign,
  showsAmounts,
  onOpen,
  onDonate,
}: {
  campaign: Campaign;
  showsAmounts: boolean;
  onOpen: () => void;
  onDonate: () => void;
}) {
  const goal = campaign.goal_amount ?? 0;
  const ratio = goal > 0 ? Math.min(campaign.collected_amount / goal, 1) : 0;
  const countdown = formatCountdown(campaign.deadline);

  /*
    ⚠ LA CARTE N'EST PAS UN BOUTON, ET NE PEUT PAS L'ÊTRE.

    Elle l'était : un `Pressable` d'ouverture englobait tout, CTA compris. Le
    « Faire un Jëf » était donc un bouton DANS un bouton — HTML invalide sur
    Expo Web (« <button> cannot be a descendant of <button> », erreur
    d'hydratation), et sur natif un imbriquement que les lecteurs d'écran
    annoncent comme un seul contrôle aux deux actions confondues.

    La zone d'ouverture est maintenant une COUCHE, posée sous le contenu :
    un frère du CTA, plus son ancêtre. Le contenu par-dessus laisse passer les
    touches (`pointerEvents: "box-none"` : la vue elle-même est transparente au
    toucher, ses enfants pressables ne le sont pas), sauf le bouton, qui les
    capte. Résultat inchangé au doigt, correct dans l'arbre.
  */
  return (
    <View style={styles.railCard}>
      {/*
        `campaignVisual` garantit une image : celle du Ndiguel, ou à défaut une
        photographie authentique de la confrérie. Le voile revient donc
        toujours — et le fond violet-900 reste sous l'image, le temps qu'elle
        charge, pour que le titre blanc ne passe jamais par une phase illisible.
      */}
      <ExpoImage
        source={campaignVisual(campaign, "wide")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={160}
      />
      <LinearGradient
        colors={[...ScrimPhoto.colors]}
        locations={[...ScrimPhoto.locations]}
        style={[StyleSheet.absoluteFill, noTouch]}
      />

      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={campaign.name}
        style={StyleSheet.absoluteFill}
      />

      {countdown ? (
        <Badge
          label={countdown}
          tone="onPhoto"
          style={[styles.railBadge, noTouch]}
        />
      ) : null}

      <View style={[styles.railBottom, passThrough]}>
        <Text style={styles.railTitle} numberOfLines={2}>
          {campaign.name}
        </Text>

        {showsAmounts ? (
          <>
            <View style={styles.railAmountRow}>
              <Text style={styles.railAmount} selectable>
                {formatFCFA(campaign.collected_amount)}
              </Text>
              {goal > 0 ? (
                <Text style={styles.railMeta}>{formatPercent(ratio)}</Text>
              ) : null}
            </View>
            <ProgressBar progress={ratio} variant="onPhoto" />
          </>
        ) : (
          /*
            🔴 Cette ligne lisait `campaign.daara_name ?? "Votre Daara"`.

            Les deux moitiés posaient problème. Le repli AFFIRMAIT que le
            Ndiguel était celui du lecteur alors qu'il disait seulement que le
            champ était vide — et un Ndiguel sans Daara ciblé s'adresse à toute
            la confrérie, ce qui est le contraire. Quant à la valeur elle-même,
            `daara_name` est le Daara CIBLÉ, pas un propriétaire : un Ndiguel
            n'appartient à aucun Daara.

            On montre la fête, qui est le vrai contexte d'un Ndiguel, et à
            défaut rien. Une ligne vide vaut mieux qu'une ligne fausse.
          */
          campaign.event_name ? (
            <Text style={styles.railMeta} numberOfLines={1}>
              {campaign.event_name}
            </Text>
          ) : null
        )}

        <Button label="Faire un Jëf" onPress={onDonate} size="md" style={styles.railCta} />
      </View>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionTitle, styles.gutter]}>
        <Skeleton width={160} height={18} />
      </View>
      <View style={styles.rail}>
        <SkeletonCampaignCard style={styles.railSkeleton} />
      </View>
      <View style={[styles.gutter, styles.section]}>
        <Skeleton width={120} height={18} delay={150} />
        <Skeleton width="100%" height={56} radius={Radius.card} delay={300} />
      </View>
    </View>
  );
}

/** « Il y a 3 h ». Au-delà d'une semaine, la date parle mieux que le compte. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.alt },
  content: { paddingTop: Space.sm, gap: Space.xl },
  gutter: { paddingHorizontal: GUTTER },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: GUTTER,
  },
  greeting: { flex: 1, minWidth: 0, gap: 1 },
  salutation: { ...Type.micro, color: Ink[500], letterSpacing: 0 },
  name: { ...Type.greeting, color: Violet[900] },
  bellDot: { position: "absolute", top: 8, right: 9 },

  section: { gap: Space.md },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Space.md,
    paddingHorizontal: GUTTER,
  },
  sectionTitleLabel: { ...Type.cardTitle, color: Ink[900] },
  sectionAction: { fontFamily: Font.bold, fontSize: 12, color: Violet[700] },

  rail: { flexDirection: "row", gap: RAIL_GAP, paddingHorizontal: GUTTER },
  railSkeleton: { width: RAIL_CARD_WIDTH, height: RAIL_CARD_HEIGHT },
  railCard: {
    width: RAIL_CARD_WIDTH,
    height: RAIL_CARD_HEIGHT,
    borderRadius: Radius.card,
    ...continuous,
    overflow: "hidden",
    backgroundColor: Violet[900],
    justifyContent: "flex-end",
  },
  railBadge: { position: "absolute", top: Space.md, left: Space.md },
  railBottom: { padding: Space.md, gap: 10 },
  railTitle: { ...Type.cardTitle, color: "#FFFFFF" },
  railAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  /** Blanc, pas `montant` : le vert ne vaut que sur fond clair. */
  railAmount: { ...Type.amountCard, color: "#FFFFFF" },
  railMeta: {
    fontFamily: Font.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.86)",
  },
  railCta: { height: 40 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 5, height: 5, borderRadius: Radius.chip, backgroundColor: Ink[100] },
  dotActive: { width: 20, backgroundColor: Violet[500] },

  tutelles: { flexDirection: "row", gap: Space.md },
  tutelle: { width: 84, alignItems: "center", gap: Space.sm },
  tutelleName: { fontFamily: Font.semibold, fontSize: 12, color: Ink[900] },
  addTutelleName: { color: Ink[500] },
  addTutelle: {
    width: 56,
    height: 56,
    borderRadius: Radius.avatar,
    backgroundColor: Surface.btn,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Violet[300],
    alignItems: "center",
    justifyContent: "center",
  },

  newsCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  newsCover: { width: 60, height: 60, borderRadius: Radius.card, ...continuous },
  newsCoverEmpty: {
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  newsText: { flex: 1, gap: 3 },
  newsTitle: { ...UIType.rowTitle, color: Ink[900] },
  newsMeta: { ...Type.label, color: Ink[300] },

  emptyHome: { marginTop: 64 },
});
