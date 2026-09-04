/**
 * NumericKeypad — le pavé maison, touches de 72, chiffres 24 / 600.
 *
 * Trois décisions du contrat, et leurs raisons :
 *
 *   Touche « 000 » à la place du point décimal. Le FCFA n'a pas de centimes et
 *   les Jëfs sont presque toujours en milliers : trois frappes économisées.
 *
 *   Touches de 72 px, bien au-delà des 44 minimales, parce que ce pavé
 *   s'utilise en marchant.
 *
 *   Pavé maison plutôt que le clavier système : le clavier numérique d'Android
 *   varie d'un constructeur à l'autre et pousse l'écran vers le haut.
 */
import { Delete } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Border, Ink, Pastel, Radius, Space, Surface, UIType, continuous } from "@/theme";

/** Garde-fou de saisie : 100 millions de FCFA. Au-delà, la touche ne répond plus. */
const MAX_AMOUNT = 100_000_000;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"] as const;

interface NumericKeypadProps {
  value: number;
  onChange: (next: number) => void;
  /** Plafond de saisie. */
  max?: number;
  /** Retour haptique à chaque frappe — vrai par défaut. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function NumericKeypad({
  value,
  onChange,
  max = MAX_AMOUNT,
  haptics = true,
  style,
}: NumericKeypadProps) {
  function tap() {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function press(key: string) {
    const next = Number(`${value || ""}${key}`);
    if (!Number.isFinite(next) || next > max) return;
    tap();
    onChange(next);
  }

  function backspace() {
    tap();
    onChange(Math.floor(value / 10));
  }

  return (
    <View style={[styles.grid, style]}>
      {KEYS.map((key) => (
        <Pressable
          key={key}
          onPress={() => press(key)}
          accessibilityRole="button"
          accessibilityLabel={key}
          style={({ pressed }) => [
            styles.key,
            styles.digitKey,
            pressed && styles.keyPressed,
          ]}
        >
          <Text style={styles.digit}>{key}</Text>
        </Pressable>
      ))}

      <Pressable
        onPress={backspace}
        accessibilityRole="button"
        accessibilityLabel="Effacer le dernier chiffre"
        style={({ pressed }) => [styles.key, styles.backKey, pressed && styles.keyPressed]}
      >
        <Delete size={24} color={Ink[900]} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  key: {
    /** Trois colonnes, écart de 8 : (100 % − 2 × 8) / 3. */
    width: "31.5%",
    flexGrow: 1,
    height: 72,
    borderRadius: Radius.card,
    ...continuous,
    alignItems: "center",
    justifyContent: "center",
  },
  digitKey: {
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  backKey: { backgroundColor: Surface.btn },
  keyPressed: { backgroundColor: Pastel.lilac, borderColor: "transparent" },
  digit: { ...UIType.keypadDigit, color: Ink[900] },
});
