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
 *
 * ⚠ Le pavé travaille sur une CHAÎNE de chiffres, pas sur un nombre. Un numéro
 * de téléphone commençant par 0 en dépend, et `Number("077…")` le perdrait.
 * Ce que la chaîne représente — un montant, un numéro — regarde l'appelant :
 * `AmountSelector` en fait un nombre, l'écran de connexion un numéro. C'est ce
 * qui évite d'avoir deux pavés dans le produit.
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

/** Hauteur de touche du contrat. */
const KEY_HEIGHT = 72;

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

interface NumericKeypadProps {
  /** Les chiffres saisis, sans séparateur. */
  value: string;
  onChange: (next: string) => void;
  /** Nombre maximal de chiffres. 9 pour un numéro sénégalais. */
  maxLength?: number;
  /**
   * La touche « 000 ». Vraie pour un montant — c'est le contrat ; fausse pour
   * un numéro de téléphone, où elle n'a aucun sens.
   */
  thousandsKey?: boolean;
  /** 72 par défaut. Réductible quand le pavé vit dans une feuille basse. */
  keyHeight?: number;
  /** Retour haptique à chaque frappe — vrai par défaut. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function NumericKeypad({
  value,
  onChange,
  maxLength = 12,
  thousandsKey = true,
  keyHeight = KEY_HEIGHT,
  haptics = true,
  style,
}: NumericKeypadProps) {
  function tap() {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function press(key: string) {
    const next = value + key;
    if (next.length > maxLength) return;
    tap();
    onChange(next);
  }

  function backspace() {
    if (!value) return;
    tap();
    onChange(value.slice(0, -1));
  }

  const keys: string[] = thousandsKey
    ? [...DIGITS, "000", "0"]
    : [...DIGITS, "0"];

  return (
    <View style={[styles.grid, style]}>
      {keys.map((key) => (
        <Pressable
          key={key}
          onPress={() => press(key)}
          accessibilityRole="button"
          accessibilityLabel={key}
          style={({ pressed }) => [
            styles.key,
            { height: keyHeight },
            styles.digitKey,
            /* Sans la touche « 000 », le « 0 » prend sa place centrale. */
            !thousandsKey && key === "0" && styles.keyCentered,
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
        style={({ pressed }) => [
          styles.key,
          { height: keyHeight },
          styles.backKey,
          pressed && styles.keyPressed,
        ]}
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
    borderRadius: Radius.card,
    ...continuous,
    alignItems: "center",
    justifyContent: "center",
  },
  /**
   * Sans « 000 », la dernière rangée n'a que « 0 » et l'effacement. Le décalage
   * d'une colonne remet le « 0 » sous le « 8 », là où le pouce l'attend.
   */
  keyCentered: { marginLeft: "34.25%" },
  digitKey: {
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  backKey: { backgroundColor: Surface.btn },
  keyPressed: { backgroundColor: Pastel.lilac, borderColor: "transparent" },
  digit: { ...UIType.keypadDigit, color: Ink[900] },
});
