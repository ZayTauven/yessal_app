/**
 * Badge — la pastille d'état.
 *
 * Planche « Composants » : marge 6 / 12, capsule, libellé 11 / 700.
 * Cinq tons, chacun avec sa raison d'être :
 *
 *   dark      J-10 sur fond clair — violet-900, texte blanc
 *   onPhoto   J-10 posé sur une photographie — blanc opaque à 92 %
 *   active    « Actif » — violet-100 / violet-700
 *   closed    « Clôturé » — le gris de bouton / encre secondaire
 *   upcoming  « À venir » — le jaune pastel, texte violet-900
 *
 * `Dot` est la pastille nue de 10 px : un non-lu, une alerte.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Border, Ink, Pastel, Radius, Status, Surface, UIType, Violet } from "@/theme";

export type BadgeTone = "dark" | "onPhoto" | "active" | "closed" | "upcoming";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = "dark", style }: BadgeProps) {
  return (
    <View style={[styles.base, TONES[tone].container, style]}>
      <Text style={[styles.label, TONES[tone].label]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface DotProps {
  /** `error` par défaut — c'est le non-lu de la barre d'onglets. */
  color?: string;
  size?: number;
  /** Anneau blanc, pour poser la pastille sur une icône. */
  ringed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Dot({ color = Status.error, size = 10, ringed = false, style }: DotProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Radius.chip,
          backgroundColor: color,
        },
        ringed && { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)" },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.chip,
    alignSelf: "flex-start",
  },
  label: UIType.badgeLabel,
});

const TONES: Record<BadgeTone, { container: ViewStyle; label: { color: string } }> = {
  dark: {
    container: { backgroundColor: Violet[900] },
    label: { color: Surface.default },
  },
  onPhoto: {
    container: {
      backgroundColor: "rgba(255,255,255,0.92)",
      borderWidth: 1,
      borderColor: Border.hairline,
    },
    label: { color: Violet[900] },
  },
  active: {
    container: { backgroundColor: Violet[100] },
    label: { color: Violet[700] },
  },
  closed: {
    container: { backgroundColor: Surface.btn },
    label: { color: Ink[500] },
  },
  upcoming: {
    container: { backgroundColor: Pastel.yellow },
    label: { color: Violet[900] },
  },
};
