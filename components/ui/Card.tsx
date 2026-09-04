/**
 * Card — le conteneur neutre du produit.
 *
 * Planche « Composants » : fond blanc, rayon 20 continu, filet à 8 %,
 * marge interne 20. AUCUNE ombre — l'élévation est réservée à la barre
 * d'onglets et aux feuilles modales (contrainte technique du brief §5).
 *
 * Remplace `GlassCard`, qui portait une ombre et un filet vert.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Border, Radius, Space, Surface, continuous } from "@/theme";

interface CardProps {
  children: React.ReactNode;
  /** `alt` : fond gris de section, sans filet. Pour les cartes dans une carte. */
  tone?: "default" | "alt";
  /** Marge interne. `false` pour un contenu qui doit toucher les bords. */
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  tone = "default",
  padded = true,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const base = [
    styles.base,
    tone === "alt" ? styles.alt : styles.default,
    padded && styles.padded,
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.card,
    ...continuous,
  },
  default: {
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  alt: {
    backgroundColor: Surface.alt,
  },
  padded: { padding: Space.xl },
  pressed: { opacity: 0.88 },
});
