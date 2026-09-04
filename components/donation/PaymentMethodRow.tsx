/**
 * PaymentMethodRow — hauteur 68, rayon 20, sélection = filet violet-500.
 *
 * ⚠ La liste ne vient PAS de la planche « Composants », qui en dessinait huit,
 * dont deux inexistantes côté serveur (PayPal, Free Money). Elle vient du jeu
 * canonique de `yessal-backend/contributions/models.py`, arbitré au §3.1 du
 * plan d'implémentation :
 *
 *   orange_money  Orange Money       Sans frais
 *   wave          Wave               Sans frais
 *   bictorys      Carte bancaire     Visa, Mastercard
 *   virement      Virement bancaire  Référence à saisir      → chevron
 *   manual        Collecteur         Espèces, en main propre
 *
 * Le virement porte un chevron et non une case : c'est le seul moyen qui
 * n'est pas un choix immédiat — il ouvre un second écran où saisir la
 * référence.
 *
 * La planche annonçait « 1,5 % de frais » sur la carte bancaire. Le chiffre
 * n'est pas dans le backend : il n'est pas affiché tant qu'il n'est pas
 * confirmé. Annoncer un taux faux sur un écran de paiement se paie cher.
 */
import { Check, ChevronRight } from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { PaymentMethod } from "@/types/donation.types";
import { Border, Ink, Radius, Space, Surface, Type, UIType, Violet } from "@/theme";

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  hint: string;
  /** Le virement ouvre un second écran : chevron plutôt que case à cocher. */
  opensScreen?: boolean;
}

export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  { value: "orange_money", label: "Orange Money", hint: "Sans frais" },
  { value: "wave", label: "Wave", hint: "Sans frais" },
  { value: "bictorys", label: "Carte bancaire", hint: "Visa, Mastercard" },
  {
    value: "virement",
    label: "Virement bancaire",
    hint: "Référence à saisir",
    opensScreen: true,
  },
  { value: "manual", label: "Collecteur", hint: "Espèces, en main propre" },
] as const;

export const PAYMENT_LOGOS: Record<PaymentMethod, number> = {
  orange_money: require("@/assets/images/orange money.png"),
  wave: require("@/assets/images/wave.png"),
  bictorys: require("@/assets/images/carte-paiement.png"),
  virement: require("@/assets/images/banque.png"),
  manual: require("@/assets/images/collecteur.png"),
};

interface PaymentMethodRowProps {
  method: PaymentMethodOption;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PaymentMethodRow({
  method,
  selected = false,
  onPress,
  disabled = false,
  style,
}: PaymentMethodRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={method.opensScreen ? "button" : "radio"}
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${method.label} — ${method.hint}`}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.rowSelected : styles.rowRest,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <ExpoImage
        source={PAYMENT_LOGOS[method.value]}
        style={styles.logo}
        contentFit="contain"
      />

      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>
          {method.label}
        </Text>
        <Text style={styles.hint} numberOfLines={1}>
          {method.hint}
        </Text>
      </View>

      {method.opensScreen ? (
        <ChevronRight size={20} color={Ink[300]} strokeWidth={1.5} />
      ) : selected ? (
        <View style={styles.radioOn}>
          <Check size={14} color={Surface.default} strokeWidth={2.5} />
        </View>
      ) : (
        <View style={styles.radioOff} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 68,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    backgroundColor: Surface.default,
    paddingHorizontal: Space.lg,
    gap: 14,
    borderWidth: 1.5,
  },
  rowRest: { borderColor: Border.hairline },
  rowSelected: { borderColor: Violet[500] },
  rowDisabled: { backgroundColor: Surface.alt, opacity: 0.6 },
  pressed: { opacity: 0.88 },
  logo: { width: 40, height: 40 },
  text: { flex: 1, gap: 2 },
  label: { ...UIType.rowTitle, color: Ink[900] },
  hint: { ...Type.label, color: Ink[500] },
  radioOff: {
    width: 22,
    height: 22,
    borderRadius: Radius.chip,
    borderWidth: 1.5,
    borderColor: Ink[100],
  },
  radioOn: {
    width: 22,
    height: 22,
    borderRadius: Radius.chip,
    backgroundColor: Violet[700],
    alignItems: "center",
    justifyContent: "center",
  },
});
