/**
 * Select — le choix dans une liste courte, passé au système (phase F).
 *
 * ── 🔴 Pourquoi `Alert.alert` a été abandonné ───────────────────────────────
 *
 * L'ancienne version empilait les options dans les **boutons** d'une
 * `Alert.alert`. Sur Android, une boîte de dialogue native n'accepte que
 * **trois** boutons — positif, négatif, neutre : au-delà, les suivants sont
 * silencieusement ignorés. `documents.tsx` propose quatre types de pièce plus
 * « Annuler », soit cinq. **Le permis de conduire et la carte d'électeur
 * n'étaient donc pas sélectionnables sur Android.**
 *
 * Remplacé par une feuille modale : elle n'a pas de plafond, elle marque
 * l'option retenue, et elle a la même allure sur les deux plateformes.
 *
 * Le champ reprend exactement le repos de `Input` — hauteur 56, rayon 14, fond
 * violet-100, filet transparent — pour qu'un formulaire ne change pas de rythme
 * d'une ligne à l'autre. Voir le commentaire de `field` plus bas.
 */
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import {
  GUTTER,
  HIT,
  Ink,
  Radius,
  Shadow,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Select({
  label,
  value,
  options,
  onSelect,
  placeholder = "Sélectionner…",
  disabled = false,
  style,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label} — ${selected?.label ?? placeholder}`}
        accessibilityState={{ disabled, expanded: open }}
        style={({ pressed }) => [
          styles.field,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={Ink[300]} strokeWidth={1.5} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="Fermer"
          onPress={() => setOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{label}</Text>

          <ScrollView bounces={false} contentContainerStyle={styles.optionList}>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {option.label}
                  </Text>
                  {active ? <Check size={18} color={Violet[700]} strokeWidth={2} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: Space.sm },
  label: { ...Type.label, color: Ink[500] },
  /*
    ⚠ MÊME REPOS QUE `Input` : fond violet-100, filet transparent, hauteur 56.
    Ce champ était blanc à filet gris, et `Input` violet pâle sans filet. Dans
    un formulaire qui les empile — « Mes informations » en aligne onze — les
    listes déroulantes tranchaient sur les champs de saisie comme si elles
    étaient d'un autre écran (capture du 2026-09-05). Rien ne justifiait deux
    traitements : les deux sont des champs, et ils se lisent ensemble.
  */
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
    height: 56,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Violet[100],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  pressed: { opacity: 0.72 },
  disabled: { backgroundColor: Surface.alt, opacity: 0.6 },
  value: { ...UIType.fieldText, color: Ink[900], flex: 1 },
  placeholder: { color: Ink[300] },

  backdrop: { flex: 1, backgroundColor: "rgba(25,11,61,0.32)" },
  sheet: {
    backgroundColor: Surface.default,
    borderTopLeftRadius: Radius.card + 4,
    borderTopRightRadius: Radius.card + 4,
    ...continuous,
    paddingHorizontal: GUTTER,
    paddingTop: Space.md,
    paddingBottom: Space.xxxl,
    gap: Space.md,
    boxShadow: Shadow.sheet,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: Radius.chip,
    backgroundColor: Ink[100],
  },
  sheetTitle: { ...Type.cardTitle, color: Ink[900] },
  optionList: { gap: Space.xs },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
    minHeight: HIT,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.input,
    ...continuous,
  },
  optionActive: { backgroundColor: Violet[100] },
  optionLabel: { ...UIType.fieldText, color: Ink[900] },
  optionLabelActive: { color: Violet[900], fontFamily: Type.cardTitle.fontFamily },
});
