/**
 * QuickActionTile — la tuile pastel de l'accueil.
 *
 * Planche « Composants » : carrée, rayon 20 continu, marge interne 14.
 * Pictogramme 40 × 40 en haut à gauche, libellé 13 / 700 en bas. Aucun
 * chevron, aucune ombre. Pressé : opacité 0,88.
 *
 * La rangée NE DÉFILE PAS — trois tuiles, et c'est tout. Une rangée qui défile
 * cache ce qu'elle contient, et ces trois destinations sont justement celles
 * qu'on veut voir d'un coup d'œil.
 *
 * ⚠ Le pictogramme est fourni par l'appelant. Les tracés de la planche
 * viennent de Fundio et ne peuvent pas être livrés (§3.2 du plan) : le jeu de
 * dix pictogrammes originaux reste dû avant la fin de la phase D.
 */
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Pastel, Radius, Space, UIType, Violet, continuous } from "@/theme";

export type TileTone = keyof typeof Pastel;

interface QuickActionTileProps {
  label: string;
  /** Tracé monoline 40 × 40, trait violet-900. */
  picto: React.ReactNode;
  tone: TileTone;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function QuickActionTile({
  label,
  picto,
  tone,
  onPress,
  style,
}: QuickActionTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: Pastel[tone] },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.picto}>{picto}</View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** La rangée de trois. Écart de 10, comme sur la planche. */
export function QuickActionRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.tile,
    ...continuous,
    padding: 14,
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.88 },
  picto: { width: 40, height: 40 },
  label: { ...UIType.chipLabel, color: Violet[900] },
  row: { flexDirection: "row", gap: Space.sm + 2 },
});
