/**
 * Composer — le champ de saisie épinglé au bas d'une conversation.
 *
 * Planche « Accueil et Onglets » : capsule violet-100 de 48, bouton d'envoi de
 * 48 en violet-300, filet à 8 % au-dessus, fond blanc. Le libellé du champ
 * change avec la variante — « Écrire un message… » en tête-à-tête,
 * « Message au Daara… » en groupe.
 *
 * ── Ce que la planche dessine et qui n'est pas ici ──────────────────────────
 *
 * Le bouton « + » à gauche du champ. Il ouvre une pièce jointe, et
 * `ContentService.createMessage` poste du JSON : envoyer un fichier demande un
 * `multipart/form-data` et un sélecteur de documents que le produit n'a pas
 * encore. Un bouton qui ne fait rien est pire qu'un bouton absent — c'est
 * l'arbitrage déjà retenu pour le bouton de message de l'organisateur d'un
 * Ndiguel. Les messages `file` REÇUS s'affichent, eux : voir `MessageBubble`.
 *
 * `Input` n'est pas réutilisé : la primitive porte un libellé, une marge basse
 * héritée et un rayon de 14, là où la planche veut une capsule nue qui grandit
 * sur plusieurs lignes.
 */
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Send } from "lucide-react-native";

import { Border, GUTTER, Ink, Radius, Space, Surface, UIType, Violet } from "@/theme";

/** Hauteur au repos, et plafond au-delà duquel le champ défile en interne. */
const FIELD_MIN = 48;
const FIELD_MAX = 120;

interface ComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  sending?: boolean;
  /** Marge basse de l'appareil — la capsule ne doit pas toucher le bord. */
  bottomInset: number;
}

export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  sending = false,
  bottomInset,
}: ComposerProps) {
  const ready = value.trim().length > 0 && !sending;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, Space.lg) }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Ink[300]}
        multiline
        style={styles.field}
        /*
          La touche retour ajoute une ligne, elle ne ferme pas le clavier :
          l'envoi est au bouton. `submitBehavior` remplace `blurOnSubmit`, que
          React Native déprécie (`TextInput.d.ts:736`).
        */
        submitBehavior="newline"
        accessibilityLabel={placeholder}
      />

      <Pressable
        onPress={onSend}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel="Envoyer le message"
        accessibilityState={{ disabled: !ready, busy: sending }}
        style={({ pressed }) => [
          styles.send,
          !ready && styles.sendDisabled,
          pressed && ready && styles.pressed,
        ]}
      >
        <Send
          size={20}
          color={ready ? Violet[900] : Violet[300]}
          strokeWidth={1.8}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: GUTTER,
    paddingTop: Space.md,
    backgroundColor: Surface.default,
    borderTopWidth: 1,
    borderTopColor: Border.hairline,
  },
  field: {
    flex: 1,
    minHeight: FIELD_MIN,
    maxHeight: FIELD_MAX,
    borderRadius: Radius.chip,
    backgroundColor: Violet[100],
    paddingHorizontal: 18,
    /*
      Le rembourrage vertical remplace `textAlignVertical` : sur Android, un
      champ `multiline` centre son texte et la première ligne remonte d'un
      cheveu quand le champ grandit.
    */
    paddingTop: 14,
    paddingBottom: 14,
    ...UIType.fieldText,
    color: Ink[900],
  },
  send: {
    width: FIELD_MIN,
    height: FIELD_MIN,
    borderRadius: Radius.button,
    backgroundColor: Violet[300],
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: Violet[100] },
  pressed: { opacity: 0.72 },
});
