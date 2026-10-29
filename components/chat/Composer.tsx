/**
 * Composer — le champ de saisie épinglé au bas d'une conversation.
 *
 * Planche « Accueil et Onglets » : capsule violet-100 de 48, bouton d'envoi de
 * 48 en violet-300, filet à 8 % au-dessus, fond blanc. Le libellé du champ
 * change avec la variante — « Écrire un message… » en tête-à-tête,
 * « Message au Daara… » en groupe.
 *
 * ── Le bouton « + » de la planche, enfin branché ────────────────────────────
 *
 * Il était resté absent : `createMessage` ne postait que du JSON. Il ouvre
 * désormais la galerie, et l'image part en multipart (`lib/upload.ts`). Les
 * documents restent hors champ — il faudrait `expo-document-picker`, que le
 * produit n'embarque pas ; on les envoie depuis le web.
 *
 * L'image n'est PAS recompressée (`quality: 1`) : la lisibilité d'une photo de
 * reçu ou de liste prime sur le poids — arbitrage déjà rendu pour tous les
 * téléversements de l'application.
 *
 * Au-dessus du champ, deux bandeaux possibles : la réponse en cours (on cite
 * qui l'on reprend) et l'image choisie, chacun avec sa croix.
 */
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Reply, Send, X } from "lucide-react-native";

import type { Message } from "@/types/content.types";
import { Border, Font, GUTTER, Ink, Radius, Space, Surface, Type, UIType, Violet } from "@/theme";

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
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  imageUri?: string | null;
  onPickImage?: (uri: string | null) => void;
  /** Le pilotage du Daara peut couper les pièces jointes. */
  allowImages?: boolean;
}

export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  sending = false,
  bottomInset,
  replyingTo = null,
  onCancelReply,
  imageUri = null,
  onPickImage,
  allowImages = true,
}: ComposerProps) {
  const ready = (value.trim().length > 0 || !!imageUri) && !sending;

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Accès refusé", "Autorisez l'accès à vos photos pour en partager une.");
      return;
    }
    const chosen = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (chosen.canceled || !chosen.assets[0]) return;
    onPickImage?.(chosen.assets[0].uri);
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, Space.lg) }]}>
      {replyingTo ? (
        <View style={styles.banner}>
          <Reply size={16} color={Violet[700]} strokeWidth={1.8} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              Réponse à {replyingTo.sender?.name || "un membre"}
            </Text>
            <Text style={styles.bannerBody} numberOfLines={1}>
              {replyingTo.message_type === "file"
                ? `Pièce jointe${replyingTo.file_name ? ` : ${replyingTo.file_name}` : ""}`
                : replyingTo.content}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={Space.md} accessibilityLabel="Annuler la réponse">
            <X size={18} color={Ink[500]} strokeWidth={1.8} />
          </Pressable>
        </View>
      ) : null}

      {imageUri ? (
        <View style={styles.banner}>
          <Image source={{ uri: imageUri }} style={styles.thumb} />
          <Text style={[styles.bannerBody, styles.bannerText]} numberOfLines={2}>
            Image prête — ajoutez une légende si vous voulez.
          </Text>
          <Pressable onPress={() => onPickImage?.(null)} hitSlop={Space.md} accessibilityLabel="Retirer l'image">
            <X size={18} color={Ink[500]} strokeWidth={1.8} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bar}>
        {allowImages && onPickImage ? (
          <Pressable
            onPress={pick}
            accessibilityRole="button"
            accessibilityLabel="Joindre une photo"
            style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
          >
            <ImagePlus size={20} color={Violet[900]} strokeWidth={1.7} />
          </Pressable>
        ) : null}

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
          <Send size={20} color={ready ? Violet[900] : Violet[300]} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Space.sm,
    paddingHorizontal: GUTTER,
    paddingTop: Space.md,
    backgroundColor: Surface.default,
    borderTopWidth: 1,
    borderTopColor: Border.hairline,
  },
  bar: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    borderRadius: 14,
    backgroundColor: Violet[100],
    borderLeftWidth: 3,
    borderLeftColor: Violet[500],
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerTitle: { ...Type.micro, fontFamily: Font.semibold, color: Violet[700] },
  bannerBody: { ...Type.label, color: Ink[500] },
  thumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: Surface.btn },
  plus: {
    width: FIELD_MIN,
    height: FIELD_MIN,
    borderRadius: Radius.button,
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
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
