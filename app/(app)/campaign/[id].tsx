/**
 * app/(app)/campaign/[id].tsx — le détail d'un Ndiguel.
 *
 * Écran 2 des cinq de la planche « Faire un Jëf ». Il vient après la liste et
 * mène à la feuille du Jëf.
 *
 * LA COMPOSITION : une photographie de 300 qui porte le nom, puis le corps —
 * qui participe, où en est la collecte, ce que le guide demande, et qui répond
 * de ce Ndiguel. L'action est épinglée en bas, elle ne défile jamais.
 *
 * ── La règle des rôles, et sa nuance ────────────────────────────────────────
 *
 * Un talibé ne voit pas la somme collectée. À sa place, la planche met les
 * visages et le nombre de participants : **l'écran ne rétrécit pas, il dit
 * autre chose.** La piste de progression reste dessinée, vide — une barre
 * absente se lirait comme un défaut de chargement.
 *
 * ⚠ Ce masquage est une règle d'AFFICHAGE, pas une frontière de sécurité :
 * `/etat/` renvoie les montants à tout utilisateur authentifié. Voir
 * `lib/roles.ts` et le registre de dette.
 *
 * ── Ce qui a disparu de l'ancien écran ──────────────────────────────────────
 *
 * — **le carrousel « Moyens de paiement acceptés »**. Cinq logos alignés sur
 *   une fiche de campagne : l'information est vraie mais elle arrive deux
 *   écrans trop tôt, et elle est répétée par l'écran de paiement, qui lui la
 *   rend actionnable ;
 * — **la carte « Rattachement »**, avec ses pastilles « Événement » et
 *   « Daara ». La fête est désormais la sur-titre de la photographie, là où on
 *   la lit sans la chercher ;
 * — les trois colonnes Collecté / Objectif / Progression, remplacées par la
 *   ligne unique de la planche.
 *
 * ── Une déviation assumée par rapport à la planche ──────────────────────────
 *
 * La planche pose le chevron de retour DANS la photographie, donc il défile
 * avec elle. Sur un appareil, passé 300 px de défilement, l'utilisateur n'a
 * plus de retour visible — seul le geste natif reste. Le chevron est donc
 * ÉPINGLÉ ici, et prend le ton `neutral` (gris #EDF0ED) plutôt que le blanc
 * translucide de la planche : un blanc à 92 % disparaîtrait sur le fond blanc
 * du corps, alors qu'un gris clair se lit aussi bien sur la photographie que
 * sur le blanc. Un seul ton, lisible partout, aucun état à tenir.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, MessageSquare, Share2 } from "lucide-react-native";

import { Avatar, AvatarStack, type StackedPerson } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { campaignVisual } from "@/lib/campaign-visuals";
import { ContentService } from "@/lib/content.service";
import { formatCountdown, formatFCFA, formatNumber, formatPercent } from "@/lib/format";
import { canSeeAmounts } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";
import type { Campaign, CampaignEtat } from "@/types/campaign.types";
import {
  Border,
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
  montant,
} from "@/theme";

/** Hauteur de la photographie, mesurée sur la planche. */
const HERO_HEIGHT = 300;
/** Au-delà, la description est repliée derrière « Lire la suite ». */
const DESCRIPTION_CLAMP = 4;
/** Visages montrés avant la pastille « +N ». */
const FACES = 4;

function parseId(value?: string | string[]): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

interface DetailState {
  status: "loading" | "ready" | "failed";
  campaign: Campaign | null;
  /**
   * L'état de la collecte — participants et contributions. `null` quand
   * l'appel échoue, ce qui n'est PAS une erreur d'écran : la fiche du Ndiguel
   * se lit très bien sans le décompte, et refuser de l'afficher pour cela
   * serait disproportionné.
   */
  etat: CampaignEtat | null;
}

/**
 * Les deux appels partent ensemble. Seul l'échec du PREMIER fait basculer
 * l'écran en erreur : sans le Ndiguel il n'y a rien à montrer, sans son état
 * il manque une ligne.
 */
async function fetchDetail(id: number): Promise<DetailState> {
  const [campaign, etat] = await Promise.all([
    ContentService.getCampaignById(id).catch(() => null),
    ContentService.getCampaignEtat(id).catch(() => null),
  ]);
  if (!campaign) return { status: "failed", campaign: null, etat: null };
  return { status: "ready", campaign, etat };
}

export default function CampaignDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const campaignId = parseId(params.id);
  const { user } = useAuthStore();
  const showsAmounts = canSeeAmounts(user?.role);

  const [state, setState] = useState<DetailState>({
    status: campaignId ? "loading" : "failed",
    campaign: null,
    etat: null,
  });
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    if (!campaignId) return;
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchDetail(campaignId).then(setState);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    let active = true;
    fetchDetail(campaignId).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [campaignId]);

  const { status, campaign, etat } = state;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {status === "failed" ? (
        <View style={[styles.centered, { paddingTop: insets.top + Space.huge }]}>
          <ErrorState
            body="Ce Ndiguel n'a pas pu être chargé."
            onRetry={campaignId ? load : undefined}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Hero campaign={campaign} />

          <View style={styles.body}>
            {status === "loading" || !campaign ? (
              <LoadingBody />
            ) : (
              <>
                <Participants etat={etat} />

                <Collecte
                  campaign={campaign}
                  showsAmounts={showsAmounts}
                />

                <Description
                  campaign={campaign}
                  expanded={expanded}
                  onExpand={() => setExpanded(true)}
                />

                <Organisateur
                  campaign={campaign}
                  onMessage={() => router.push("/chat")}
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Le chevron épinglé — voir l'en-tête du fichier. */}
      <View style={[styles.backSlot, { top: insets.top + Space.sm }]} pointerEvents="box-none">
        <IconButton
          icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel="Revenir"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/campaigns"))}
        />
      </View>

      {status === "ready" && campaign ? (
        <ActionBar
          campaign={campaign}
          bottomInset={insets.bottom}
          onDonate={() =>
            router.push({
              pathname: "/donate",
              params: { campaignId: String(campaign.id) },
            })
          }
        />
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Hero({ campaign }: { campaign: Campaign | null }) {
  const countdown = campaign ? formatCountdown(campaign.deadline) : null;
  /** Le décompte n'a de sens que devant : « Clôturé » est déjà dit par le statut. */
  const showCountdown = Boolean(countdown) && countdown !== "Clôturé";

  return (
    <View style={styles.hero}>
      {campaign ? (
        <ExpoImage
          source={campaignVisual(campaign, "wide")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]} />
      )}

      <LinearGradient
        colors={ScrimPhoto.colors}
        locations={ScrimPhoto.locations}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {campaign ? (
        <>
          {showCountdown ? (
            <View style={styles.countdown}>
              <Text style={styles.countdownLabel}>{countdown}</Text>
            </View>
          ) : null}

          <View style={styles.heroText}>
            {campaign.event_name ? (
              <Text style={styles.heroOverline} numberOfLines={1}>
                {campaign.event_name}
              </Text>
            ) : null}
            <Text style={styles.heroTitle} numberOfLines={3}>
              {campaign.name}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function Participants({ etat }: { etat: CampaignEtat | null }) {
  const count = etat?.donation_count ?? 0;
  if (!etat || count === 0) return null;

  /**
   * Les contributeurs anonymes comptent dans le total mais ne montrent pas de
   * visage : la pile afficherait leurs initiales, c'est-à-dire celles de
   * « Contributeur anonyme » — quatre fois la même pastille « CA ».
   */
  const faces: StackedPerson[] = etat.contributions
    .filter((c) => !c.is_anonymous)
    .slice(0, FACES)
    .map((c) => ({ name: c.member_name }));

  return (
    <View style={styles.participants}>
      {faces.length > 0 ? (
        <AvatarStack people={faces} size={32} max={FACES} total={count} />
      ) : null}
      <Text style={styles.participantsLabel}>
        {count === 1
          ? "1 talibé y participe"
          : `${formatNumber(count)} talibés y participent`}
      </Text>
    </View>
  );
}

function Collecte({
  campaign,
  showsAmounts,
}: {
  campaign: Campaign;
  showsAmounts: boolean;
}) {
  const goal = campaign.goal_amount ?? 0;
  const ratio = goal > 0 ? Math.min(campaign.collected_amount / goal, 1) : 0;
  const closing = formatDeadline(campaign.deadline);

  if (!showsAmounts) {
    return (
      <View style={styles.collecte}>
        {/* Piste vide, jamais absente : `hidden` est fait pour ce cas. */}
        <ProgressBar hidden />
        <Text style={styles.collecteNote}>
          {closing
            ? `La collecte est suivie par le chef de votre Daara. Clôture le ${closing}.`
            : "La collecte est suivie par le chef de votre Daara."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.collecte}>
      <View style={styles.collecteHead}>
        <Text style={styles.collecteAmount}>{formatFCFA(campaign.collected_amount)}</Text>
        {goal > 0 ? (
          <Text style={styles.collecteGoal}>sur {formatNumber(goal)}</Text>
        ) : null}
      </View>
      <ProgressBar progress={ratio} />
      <Text style={styles.collecteNote}>
        {[
          goal > 0 ? `${formatPercent(ratio)} de l'objectif` : "Objectif ouvert",
          closing ? `clôture le ${closing}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </View>
  );
}

function Description({
  campaign,
  expanded,
  onExpand,
}: {
  campaign: Campaign;
  expanded: boolean;
  onExpand: () => void;
}) {
  /**
   * `objective` dit à quoi sert la collecte, `description` la raconte. Quand
   * les deux existent, l'objectif ferme le paragraphe — il répond à la question
   * que la description vient de poser.
   */
  const text = [campaign.description, campaign.objective]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");

  if (!text) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Le Ndiguel</Text>
      <Text
        style={styles.description}
        numberOfLines={expanded ? undefined : DESCRIPTION_CLAMP}
      >
        {text}
      </Text>
      {expanded ? null : (
        <Pressable
          onPress={onExpand}
          accessibilityRole="button"
          hitSlop={Space.sm}
          style={styles.more}
        >
          <Text style={styles.moreLabel}>Lire la suite</Text>
        </Pressable>
      )}
    </View>
  );
}

function Organisateur({
  campaign,
  onMessage,
}: {
  campaign: Campaign;
  onMessage: () => void;
}) {
  const name = campaign.organizer_name?.trim();
  if (!name) return null;

  return (
    <Card style={styles.organizer}>
      <Avatar name={name} size={40} />
      <View style={styles.organizerText}>
        <Text style={styles.organizerName} numberOfLines={1}>
          {name}
        </Text>
        {campaign.daara_name ? (
          <Text style={styles.organizerRole} numberOfLines={1}>
            Daara de {campaign.daara_name}
          </Text>
        ) : null}
      </View>
      {/*
        Le bouton de message est DÉCORATIF sur la planche. Il ne l'est pas ici :
        `comms/` n'expose pas d'ouverture de conversation par utilisateur, et un
        bouton qui ne fait rien est pire qu'un bouton absent. Il mène donc à la
        messagerie, où la conversation se retrouve.
      */}
      <IconButton
        icon={<MessageSquare size={18} color={Ink[900]} strokeWidth={1.5} />}
        accessibilityLabel={`Écrire à ${name}`}
        onPress={onMessage}
      />
    </Card>
  );
}

function ActionBar({
  campaign,
  bottomInset,
  onDonate,
}: {
  campaign: Campaign;
  bottomInset: number;
  onDonate: () => void;
}) {
  /**
   * Un Ndiguel clôturé ou en attente n'accepte pas de Jëf — le backend le
   * refuserait (`handleSubmit` vérifiait déjà `status !== "active"`, mais après
   * avoir laissé l'utilisateur remplir tout le formulaire). Autant le dire
   * avant, sur le bouton.
   */
  const open = campaign.status === "active";

  return (
    <View style={[styles.actionBar, { paddingBottom: Math.max(bottomInset, Space.xl) }]}>
      <LinearGradient
        colors={["rgba(255,255,255,0)", Surface.default]}
        locations={[0, 0.42]}
        style={styles.actionFade}
        pointerEvents="none"
      />
      <View style={styles.actionRow}>
        <Button
          label={open ? "Faire un Jëf" : "Ndiguel clôturé"}
          onPress={onDonate}
          disabled={!open}
          style={styles.actionButton}
        />
        <IconButton
          icon={<Share2 size={20} color={Violet[900]} strokeWidth={1.5} />}
          accessibilityLabel="Partager ce Ndiguel"
          tone="neutral"
          onPress={() => shareCampaign(campaign)}
          style={styles.actionShare}
        />
      </View>
    </View>
  );
}

/**
 * Le partage passe par la feuille native. `Share` vient de React Native, pas
 * d'une dépendance : c'est le même geste que celui de n'importe quelle autre
 * application, et le lien profond que l'on partage est celui que la garde sait
 * désormais rejouer après connexion (`lib/pending-route.ts`).
 */
async function shareCampaign(campaign: Campaign) {
  const { Share } = await import("react-native");
  try {
    await Share.share({
      message: `${campaign.name} — un Ndiguel sur Yessal Gui\nyessalgui://campaign/${campaign.id}`,
    });
  } catch {
    /* L'utilisateur a fermé la feuille. Ce n'est pas une erreur. */
  }
}

function LoadingBody() {
  return (
    <View style={styles.loading}>
      <Skeleton width="60%" height={20} />
      <Skeleton width="100%" height={8} radius={Radius.chip} />
      <Skeleton width="45%" height={14} />
      <Skeleton width="100%" height={72} radius={Radius.card} />
    </View>
  );
}

/** « 2026-09-13 » → « 13 septembre ». L'année n'est utile qu'au-delà. */
function formatDeadline(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },
  centered: { flex: 1, paddingHorizontal: GUTTER },
  /** La barre d'action est absolue : le défilement doit pouvoir passer dessous. */
  scroll: { paddingBottom: 120 },

  hero: {
    height: HERO_HEIGHT,
    backgroundColor: Violet[900],
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroPlaceholder: { backgroundColor: Violet[900] },
  countdown: {
    position: "absolute",
    top: Space.md,
    right: GUTTER,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.chip,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  countdownLabel: { ...UIType.badgeLabel, color: Violet[900] },
  heroText: { paddingHorizontal: GUTTER, paddingBottom: Space.lg, gap: Space.xs },
  heroOverline: {
    ...Type.micro,
    fontFamily: Font.semibold,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.78)",
  },
  heroTitle: { ...Type.greeting, color: "#FFFFFF" },

  backSlot: { position: "absolute", left: GUTTER },

  body: { paddingHorizontal: GUTTER, paddingTop: Space.xl, gap: Space.xl },
  loading: { gap: Space.lg },

  participants: { flexDirection: "row", alignItems: "center", gap: Space.md },
  participantsLabel: { ...Type.label, color: Ink[500], flexShrink: 1 },

  collecte: { gap: Space.md },
  collecteHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  collecteAmount: { ...Type.greeting, color: montant },
  collecteGoal: { ...Type.label, color: Ink[500] },
  collecteNote: { ...Type.label, color: Ink[500], lineHeight: 18 },

  section: { gap: Space.sm },
  sectionTitle: { ...Type.cardTitle, color: Ink[900] },
  description: { ...Type.body, color: Ink[900] },
  more: { alignSelf: "flex-start" },
  moreLabel: { fontFamily: Font.bold, fontSize: 14, lineHeight: 21, color: Violet[700] },

  organizer: { flexDirection: "row", alignItems: "center", gap: Space.md },
  organizerText: { flex: 1, gap: 2 },
  organizerName: { ...UIType.personName, color: Ink[900] },
  organizerRole: { ...Type.label, color: Ink[500] },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: GUTTER,
    paddingTop: Space.lg,
  },
  /** Le dégradé déborde vers le haut : le contenu s'efface avant d'atteindre le bouton. */
  actionFade: { position: "absolute", left: 0, right: 0, bottom: 0, top: -Space.xxl },
  actionRow: { flexDirection: "row", alignItems: "center", gap: Space.md },
  actionButton: { flex: 1 },
  actionShare: {
    width: 52,
    height: 52,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Border.strong,
    backgroundColor: Surface.default,
    ...continuous,
  },
});
