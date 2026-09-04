/**
 * Skeleton — « aux formes du contenu réel, pas de roue qui tourne ».
 *
 * Planche « Composants » : bloc violet-100, opacité qui respire de 0,55 à 1
 * sur 1,4 s, chaque bloc décalé de 0,15 s sur le précédent.
 *
 * L'animation vit sur le fil natif (Reanimated) : aucun re-rendu React, donc
 * une liste de squelettes ne coûte rien même sur un Android d'entrée de gamme.
 */
import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Border, Radius, Space, Surface, Violet, continuous } from "@/theme";

/** Une pulsation complète : 0,55 → 1 → 0,55. */
const PULSE_MS = 700;

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  /** Décalage de la pulsation, en ms. 0 · 150 · 300 sur la planche. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 8,
  delay = 0,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [delay, opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: Violet[100] },
        radius < 999 ? continuous : null,
        pulse,
        style,
      ]}
    />
  );
}

/**
 * Le squelette d'une CampaignCard — même hauteur, mêmes masses.
 * Badge en haut à gauche, titre, sous-titre, piste de progression.
 */
export function SkeletonCampaignCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.campaign, style]}>
      <Skeleton width={56} height={24} radius={Radius.chip} />
      <View style={styles.campaignBottom}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={12} delay={150} />
        <Skeleton width="100%" height={6} radius={Radius.chip} delay={300} />
      </View>
    </View>
  );
}

/** Le squelette d'une TutelleCard — avatar, nom, relation. */
export function SkeletonTutelleCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tutelle, style]}>
      <Skeleton width={44} height={44} radius={Radius.avatar} />
      <Skeleton width="80%" height={14} delay={150} />
      <Skeleton width="50%" height={12} delay={300} />
    </View>
  );
}

/** Le squelette d'une ligne de liste — avatar rond, deux lignes de texte. */
export function SkeletonListRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <Skeleton width={44} height={44} radius={Radius.avatar} />
      <View style={styles.rowText}>
        <Skeleton width="60%" height={14} delay={150} />
        <Skeleton width="40%" height={12} delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  campaign: {
    height: 200,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Surface.alt,
    padding: 14,
    justifyContent: "space-between",
  },
  campaignBottom: { gap: 10 },
  tutelle: {
    flex: 1,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Surface.alt,
    padding: Space.lg,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Border.hairline,
  },
  rowText: { flex: 1, gap: Space.sm },
});
