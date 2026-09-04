/**
 * AmountSelector — le montant héros et les quatre montants rapides.
 *
 * Planche « Composants ». Le chiffre est en `montant` (#1A5C3A) : c'est la
 * seule exception verte du système, et elle ne vaut que sur fond clair.
 *
 * Règle du contrat : « le montant rapide sélectionné reste sélectionné pendant
 * la frappe, et se désélectionne dès que le chiffre saisi ne correspond plus. »
 * Rien à retenir pour cela — la sélection se DÉDUIT de la valeur. Un état
 * séparé serait une source de désynchronisation.
 *
 * Le montant héros est `selectable` : le brief l'impose pour les montants.
 */
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { formatNumber } from "@/lib/format";
import {
  Ink,
  Pastel,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  montant,
} from "@/theme";

/** Les quatre paliers du contrat, en FCFA. */
export const QUICK_AMOUNTS = [5_000, 10_000, 25_000, 50_000] as const;

interface AmountSelectorProps {
  value: number;
  onChange: (next: number) => void;
  label?: string;
  quickAmounts?: readonly number[];
  style?: StyleProp<ViewStyle>;
}

export function AmountSelector({
  value,
  onChange,
  label = "Montant de votre Jëf",
  quickAmounts = QUICK_AMOUNTS,
  style,
}: AmountSelectorProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{label}</Text>
        <View style={styles.heroAmount}>
          <Text style={styles.heroValue} selectable>
            {formatNumber(value)}
          </Text>
          <Text style={styles.heroCurrency}>FCFA</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {quickAmounts.map((amount) => {
          const selected = value === amount;
          return (
            <Pressable
              key={amount}
              onPress={() => onChange(amount)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatNumber(amount)} FCFA`}
              style={({ pressed }) => [
                styles.quick,
                selected ? styles.quickSelected : styles.quickRest,
                pressed && !selected && styles.quickPressed,
              ]}
            >
              <Text
                style={[
                  styles.quickLabel,
                  selected ? styles.quickLabelSelected : styles.quickLabelRest,
                ]}
              >
                {formatNumber(amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Space.xxl },
  hero: { alignItems: "center", gap: 6 },
  heroLabel: { ...Type.label, color: Ink[500] },
  heroAmount: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  heroValue: { ...Type.amountHero, color: montant },
  heroCurrency: { ...Type.amountCard, color: montant },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quick: {
    /** Deux colonnes : la moitié, moins la moitié de l'écart de 10. */
    width: "48%",
    flexGrow: 1,
    height: 48,
    borderRadius: Radius.chip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  quickRest: { backgroundColor: Surface.btn, borderColor: "transparent" },
  quickSelected: { backgroundColor: Pastel.lilac, borderColor: Violet[500] },
  quickPressed: { opacity: 0.72 },
  quickLabel: UIType.quickAmount,
  quickLabelRest: { color: Ink[900] },
  quickLabelSelected: { color: Violet[900] },
});
