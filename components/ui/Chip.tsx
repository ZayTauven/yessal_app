/**
 * Chip — la pilule de filtre.
 *
 * Planche « Composants » : marge 9 / 16, capsule, libellé 13.
 * Actif   → fond violet-300, libellé violet-900 en 700
 * Repos   → fond gris de bouton, libellé encre secondaire en 600
 *
 * ⚠ La pilule ne fait que 36 px de haut. Le brief impose 44 de zone tactile :
 * les 4 px manquants de chaque côté sont rendus par `hitSlop`, pas par de la
 * hauteur visible — la rangée resterait trop lourde.
 */
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Font, GUTTER, Ink, Radius, Space, Surface, UIType, Violet } from "@/theme";

/** (44 − 36) / 2 */
const TOUCH_PAD = 4;

interface ChipProps {
  label: string;
  active?: boolean;
  /** Compteur à droite du libellé — « Non lus · 3 ». */
  count?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, active = false, count, onPress, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: TOUCH_PAD, bottom: TOUCH_PAD }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.base,
        active ? styles.active : styles.rest,
        count !== undefined && styles.withCount,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, active ? styles.labelActive : styles.labelRest]}>
        {label}
      </Text>
      {count !== undefined ? (
        <View style={styles.count}>
          <Text style={styles.countLabel}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

interface ChipRowProps {
  children: React.ReactNode;
  /** Rangée défilante qui déborde de la gouttière — le cas d'une liste de filtres. */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ChipRow({ children, scrollable = true, style }: ChipRowProps) {
  if (!scrollable) return <View style={[styles.row, style]}>{children}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollRow, style]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Space.lg,
    paddingVertical: 9,
    borderRadius: Radius.chip,
  },
  withCount: { paddingRight: Space.md, gap: Space.sm },
  active: { backgroundColor: Violet[300] },
  rest: { backgroundColor: Surface.btn },
  pressed: { opacity: 0.72 },
  label: UIType.chipLabel,
  labelActive: { color: Violet[900] },
  labelRest: { fontFamily: Font.semibold, color: Ink[500] },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: Radius.chip,
    backgroundColor: Violet[700],
    alignItems: "center",
    justifyContent: "center",
  },
  countLabel: { ...UIType.badgeLabel, color: Surface.default },
  row: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  scrollRow: { flexDirection: "row", gap: Space.sm, paddingHorizontal: GUTTER },
});
