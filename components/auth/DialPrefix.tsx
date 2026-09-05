/**
 * DialPrefix — l'indicatif pressable qui ouvre `CountrySheet`.
 *
 * Se pose dans le `prefixSlot` d'un `Input`, ou en frère d'une zone de chiffres
 * dans un champ composé. Il ne connaît ni l'un ni l'autre : il montre un pays
 * et prévient quand on le presse.
 *
 * ⚠ Il porte sa propre zone tactile et doit rester FRÈRE du champ de saisie,
 * jamais autour : sur Android, une cible imbriquée dans une autre devient
 * inatteignable.
 */
import { Pressable, StyleSheet, Text } from "react-native";
import { ChevronDown } from "lucide-react-native";

import type { DialCountry } from "@/lib/dial-codes";
import { Ink, UIType, Violet } from "@/theme";

interface DialPrefixProps {
  country: DialCountry;
  onPress: () => void;
}

export function DialPrefix({ country, onPress }: DialPrefixProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Indicatif ${country.name}, ${country.prefix}. Changer de pays`}
      hitSlop={{ top: 10, bottom: 10, left: 8 }}
      style={({ pressed }) => [styles.zone, pressed && styles.pressed]}
    >
      <Text style={styles.flag}>{country.flag}</Text>
      <Text style={styles.dial}>{country.prefix}</Text>
      <ChevronDown size={14} color={Ink[300]} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  /** 20 px : un drapeau emoji rendu à la taille du texte paraît rabougri. */
  flag: { fontSize: 20, lineHeight: 24 },
  dial: { ...UIType.fieldPrefix, color: Violet[900] },
});
