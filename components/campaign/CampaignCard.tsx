/**
 * CampaignCard — « le composant le plus exposé du produit ».
 *
 * Planche « Composants » : photographie de 200, rayon 20, voile vertical,
 * badge d'échéance en haut à gauche, bloc de texte en bas.
 *
 * Deux variantes, et c'est le RÔLE qui les départage :
 *
 *   montants visibles (chef de Daara) — le montant collecté, le pourcentage,
 *   la barre de progression ;
 *
 *   montants masqués (talibé) — une pile d'avatars et « Vous et 411 talibés y
 *   participez ». Le talibé voit que la communauté avance sans voir la somme.
 *
 * ⚠ Sur une photographie, le montant est BLANC, jamais vert. Le token
 * `montant` ne vaut que sur fond clair — c'est écrit dans `theme/tokens.ts`.
 *
 * Le voile est le SEUL dégradé du produit : `ScrimPhoto`, vertical, du
 * transparent au noir à 72 %. Aucun dégradé de marque, aucun radial.
 */
import { Image as ExpoImage, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { AvatarStack, type StackedPerson } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkeletonCampaignCard } from "@/components/ui/Skeleton";
import { formatFCFA, formatPercent } from "@/lib/format";
import { Font, Radius, ScrimPhoto, Space, Type, Violet, continuous } from "@/theme";

/** Hauteur du contrat. La carte ne s'étire pas : c'est un format, pas une boîte. */
const CARD_HEIGHT = 200;
const INSET = 14;

interface CampaignCardProps {
  title: string;
  /** « Daara de Ndiassane · 412 talibés » */
  subtitle?: string;
  /**
   * L'URL renvoyée par l'API, ou un `require()` local. Les deux, parce que
   * la galerie et les états de démonstration doivent tenir hors ligne.
   */
  image?: ImageSource | string | number | null;
  /** « J-10 », « Aujourd'hui », « Clôturé » — voir `formatCountdown`. */
  badge?: string | null;

  raised?: number;
  goal?: number;

  /** Rôle sans droit de regard sur les montants — talibé. */
  amountsHidden?: boolean;
  /** Visages de la pile, variante masquée. Trois suffisent. */
  participants?: StackedPerson[];
  /** « Vous et 411 talibés y participez ». */
  participationLabel?: string;

  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CampaignCard({
  title,
  subtitle,
  image,
  badge,
  raised = 0,
  goal = 0,
  amountsHidden = false,
  participants = [],
  participationLabel,
  onPress,
  style,
}: CampaignCardProps) {
  const ratio = goal > 0 ? Math.min(raised / goal, 1) : 0;
  const source = typeof image === "string" ? { uri: image } : image;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {/*
        Sans photographie, PAS de voile : transparent → noir posé sur un fond
        clair donne un dégradé gris délavé, et le texte blanc devient illisible
        (constaté sur capture le 2026-09-04). Le fond de la carte est
        violet-900 — le blanc y tient à 14,5:1 dans les deux cas.
      */}
      {source ? (
        <>
          <ExpoImage
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={160}
          />
          <LinearGradient
            colors={[...ScrimPhoto.colors]}
            locations={[...ScrimPhoto.locations]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </>
      ) : null}

      {badge ? <Badge label={badge} tone="onPhoto" style={styles.badge} /> : null}

      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        {amountsHidden ? (
          <View style={styles.participation}>
            {participants.length > 0 ? (
              <AvatarStack people={participants} size={28} max={3} total={participants.length} />
            ) : null}
            {participationLabel ? (
              <Text style={styles.participationLabel} numberOfLines={1}>
                {participationLabel}
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.amountRow}>
              <Text style={styles.amount} selectable>
                {formatFCFA(raised)}
              </Text>
              {goal > 0 ? <Text style={styles.percent}>{formatPercent(ratio)}</Text> : null}
            </View>
            <ProgressBar progress={ratio} variant="onPhoto" />
          </>
        )}
      </View>
    </Pressable>
  );
}

export { SkeletonCampaignCard as CampaignCardSkeleton };

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: Radius.card,
    ...continuous,
    overflow: "hidden",
    backgroundColor: Violet[900],
    justifyContent: "flex-end",
  },
  pressed: { opacity: 0.88 },
  badge: { position: "absolute", top: INSET, left: INSET },
  bottom: { padding: INSET, gap: Space.sm },
  title: { ...Type.cardTitle, color: "#FFFFFF" },
  subtitle: { ...Type.label, color: "rgba(255,255,255,0.82)" },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  /** Blanc, pas `montant` : le vert ne s'applique que sur fond clair. */
  amount: { ...Type.amountCard, color: "#FFFFFF" },
  percent: { ...Type.label, color: "rgba(255,255,255,0.82)" },
  participation: { flexDirection: "row", alignItems: "center", gap: 10 },
  participationLabel: {
    fontFamily: Font.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: "#FFFFFF",
    flexShrink: 1,
  },
});
