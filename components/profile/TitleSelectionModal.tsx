/**
 * TitleSelectionModal — la demande de titre, passée au système (phase F).
 *
 * ── ⚠ Ce composant n'avait plus aucun appelant ──────────────────────────────
 *
 * Il vivait dans le `profile.tsx` de 738 lignes. La scission du §3.4, en
 * phase E, a réparti l'identité d'un côté et les réglages de l'autre — et **a
 * laissé la demande de titre sur le carreau**. Le service existe pourtant
 * (`AuthService.getTitles`, `AuthService.submitTitleRequest`), les points d'API
 * existent, et `daara.tsx` **affiche** `title_name` dans l'annuaire : un membre
 * pouvait voir le titre des autres sans avoir aucun moyen de demander le sien.
 *
 * Ce n'est donc pas du code mort, c'est une fonction dont on avait perdu la
 * poignée. Elle est rebranchée dans les Paramètres, sous « Compte ».
 *
 * La feuille suit la mécanique de `Select` : fond violet-950 à 32 %, coins
 * hauts au rayon de carte, poignée de 36.
 */
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, X } from "lucide-react-native";

import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import type { TitleOption } from "@/types";
import {
  Border,
  GUTTER,
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

interface TitleSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  titles: TitleOption[];
  onSelect: (titleId: number) => Promise<void>;
  currentTitle?: string | null;
}

export function TitleSelectionModal({
  visible,
  onClose,
  titles,
  onSelect,
  currentTitle,
}: TitleSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (selectedId === null) {
      Alert.alert("Aucun titre choisi", "Sélectionnez le titre que vous demandez.");
      return;
    }

    setSubmitting(true);
    try {
      await onSelect(selectedId);
      setSelectedId(null);
      onClose();
    } catch {
      // L'appelant porte le message : lui seul sait ce que le serveur a répondu.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="Fermer" onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Demander un titre</Text>
            <Text style={styles.subtitle}>
              Votre demande est transmise au responsable de votre Daara, qui la
              valide ou la refuse.
            </Text>
          </View>
          <IconButton
            icon={<X size={20} color={Ink[900]} strokeWidth={1.5} />}
            accessibilityLabel="Fermer"
            onPress={onClose}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {titles.map((title) => {
            const active = selectedId === title.id;
            const held = currentTitle === title.name;

            return (
              <Pressable
                key={title.id}
                onPress={() => setSelectedId(title.id)}
                disabled={held}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: held }}
                style={({ pressed }) => [
                  styles.item,
                  active && styles.itemActive,
                  held && styles.itemHeld,
                  pressed && !held && styles.pressed,
                ]}
              >
                <View style={styles.itemText}>
                  <Text style={[styles.itemName, active && styles.itemNameActive]}>
                    {title.name}
                  </Text>
                  {title.description ? (
                    <Text style={styles.itemDesc}>{title.description}</Text>
                  ) : null}
                </View>

                {held ? <Badge label="Actuel" tone="closed" /> : null}
                {active && !held ? (
                  <Check size={20} color={Violet[700]} strokeWidth={2} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          label="Soumettre la demande"
          onPress={submit}
          loading={submitting}
          disabled={selectedId === null}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(25,11,61,0.32)" },
  sheet: {
    maxHeight: "82%",
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
  header: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  headerText: { flex: 1, gap: Space.xs },
  title: { ...Type.cardTitle, color: Ink[900] },
  subtitle: { ...Type.body, color: Ink[500] },

  list: { gap: Space.sm, paddingBottom: Space.sm },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.lg,
    borderRadius: Radius.card,
    ...continuous,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  itemActive: { backgroundColor: Violet[100], borderColor: Violet[300] },
  itemHeld: { backgroundColor: Surface.alt, borderColor: "transparent" },
  pressed: { opacity: 0.72 },
  itemText: { flex: 1, gap: 2 },
  itemName: { ...UIType.rowTitle, color: Ink[900] },
  itemNameActive: { color: Violet[900] },
  itemDesc: { ...Type.body, color: Ink[500] },
});
