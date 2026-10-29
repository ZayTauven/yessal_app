/**
 * Composer — le champ de saisie épinglé au bas d'une conversation.
 *
 * Planche « Accueil et Onglets » : capsule violet-100 de 48, bouton d'envoi de
 * 48 en violet-300, filet à 8 % au-dessus, fond blanc. Le libellé du champ
 * change avec la variante — « Écrire un message… » en tête-à-tête,
 * « Message au Daara… » en groupe.
 *
 * ── Ce que WhatsApp a appris aux membres, et qu'on leur rend ici ──────────
 *
 * - le « + » ouvre la galerie OU les documents (PDF, listes, reçus) ;
 * - le micro, quand le champ est vide : un toucher lance l'enregistrement,
 *   un second l'envoie, la corbeille l'annule ;
 * - « @ » en salon propose les membres — c'est la mention qui fait sonner un
 *   téléphone dans un grand salon (`comms/services.py`, `destinataires_push`) ;
 * - corriger un message envoyé : le bandeau « Modification » remplace celui
 *   de la réponse, et l'envoi enregistre la correction.
 *
 * Les images ne sont PAS recompressées (`quality: 1`) : la lisibilité d'une
 * photo de reçu ou de liste prime sur le poids — arbitrage déjà rendu pour
 * tous les téléversements de l'application.
 *
 * Dans un canal où l'on n'est pas auteur, un bandeau remplace tout le reste.
 */
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { FileText, ImagePlus, Lock, Mic, Pencil, Plus, Reply, Send, Square, Trash2, X } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import type { Attachment, ChatMember, Message } from "@/types/content.types";
import { Border, Font, GUTTER, Ink, Radius, Space, Status, Surface, Type, UIType, Violet } from "@/theme";

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
  editing?: Message | null;
  onCancelEdit?: () => void;
  attachment?: Attachment | null;
  onAttach?: (attachment: Attachment | null) => void;
  /** Une note vocale enregistrée part aussitôt, sans légende. */
  onSendVoice?: (attachment: Attachment) => void;
  /** Le pilotage du Daara peut couper les pièces jointes. */
  allowFiles?: boolean;
  /** Membres proposés après « @ » (salons seulement). */
  members?: ChatMember[];
  currentUserId?: number;
  /** Canal où l'on n'est pas auteur : un bandeau remplace le champ. */
  readOnlyNote?: string | null;
}

function kindOf(mime: string): Attachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
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
  editing = null,
  onCancelEdit,
  attachment = null,
  onAttach,
  onSendVoice,
  allowFiles = true,
  members = [],
  currentUserId,
  readOnlyNote = null,
}: ComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [caret, setCaret] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);

  /* « @Sou » juste avant le curseur : on propose les membres qui correspondent. */
  const mention = useMemo(() => {
    if (members.length === 0) return null;
    const match = value.slice(0, caret).match(/(^|\s)@([\p{L}'-]*)$/u);
    return match ? { query: match[2].toLowerCase(), start: caret - match[2].length - 1 } : null;
  }, [value, caret, members.length]);
  const candidates = mention
    ? members.filter((m) => m.id !== currentUserId && m.name.toLowerCase().includes(mention.query)).slice(0, 5)
    : [];

  if (readOnlyNote) {
    return (
      <View style={[styles.readOnly, { paddingBottom: Math.max(bottomInset, Space.lg) }]}>
        <Lock size={15} color={Ink[500]} strokeWidth={1.8} />
        <Text style={styles.readOnlyText}>{readOnlyNote}</Text>
      </View>
    );
  }

  const recording = recState.isRecording;
  const empty = value.trim().length === 0 && !attachment;
  const ready = !empty && !sending;

  async function pickPhoto() {
    setMenuOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Accès refusé", "Autorisez l'accès à vos photos pour en partager une.");
      return;
    }
    const chosen = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    const asset = chosen.canceled ? null : chosen.assets[0];
    if (!asset) return;
    onAttach?.({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      kind: "image",
      size: asset.fileSize ?? null,
    });
  }

  async function pickDocument() {
    setMenuOpen(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const mimeType = asset.mimeType ?? "application/octet-stream";
    onAttach?.({ uri: asset.uri, name: asset.name, mimeType, kind: kindOf(mimeType), size: asset.size ?? null });
  }

  async function startRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Micro inaccessible", "Autorisez le micro pour enregistrer une note vocale.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording(send: boolean) {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const uri = recorder.uri;
    if (send && uri) {
      onSendVoice?.({ uri, name: `note-vocale-${Date.now()}.m4a`, mimeType: "audio/m4a", kind: "audio" });
    }
  }

  const insertMention = (member: ChatMember) => {
    if (!mention) return;
    const firstName = member.name.trim().split(/\s+/)[0];
    const next = `${value.slice(0, mention.start)}@${firstName} ${value.slice(caret)}`;
    onChangeText(next);
    setCaret(mention.start + firstName.length + 2);
  };

  const seconds = Math.floor((recState.durationMillis ?? 0) / 1000);
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, Space.lg) }]}>
      {candidates.length > 0 ? (
        <View style={styles.mentions} accessibilityRole="menu">
          <Text style={styles.mentionsTitle}>MENTIONNER</Text>
          {candidates.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => insertMention(m)}
              accessibilityRole="menuitem"
              style={({ pressed }) => [styles.mentionRow, pressed && styles.pressed]}
            >
              <Avatar uri={m.avatar} name={m.name} size={28} />
              <Text style={styles.mentionName} numberOfLines={1}>
                {m.name}
              </Text>
              {m.title ? <Text style={styles.titleTag}>{m.title.toUpperCase()}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {editing ? (
        <View style={styles.banner}>
          <Pencil size={16} color={Violet[700]} strokeWidth={1.8} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Modification du message</Text>
            <Text style={styles.bannerBody} numberOfLines={1}>
              {editing.content}
            </Text>
          </View>
          <Pressable onPress={onCancelEdit} hitSlop={Space.md} accessibilityLabel="Annuler la modification">
            <X size={18} color={Ink[500]} strokeWidth={1.8} />
          </Pressable>
        </View>
      ) : replyingTo ? (
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

      {attachment ? (
        <View style={styles.banner}>
          {attachment.kind === "image" ? (
            <Image source={{ uri: attachment.uri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbDoc]}>
              <FileText size={20} color={Violet[700]} strokeWidth={1.6} />
            </View>
          )}
          <Text style={[styles.bannerBody, styles.bannerText]} numberOfLines={2}>
            {attachment.kind === "image" ? "Photo prête — ajoutez une légende si vous voulez." : attachment.name}
          </Text>
          <Pressable onPress={() => onAttach?.(null)} hitSlop={Space.md} accessibilityLabel="Retirer la pièce jointe">
            <X size={18} color={Ink[500]} strokeWidth={1.8} />
          </Pressable>
        </View>
      ) : null}

      {menuOpen ? (
        <View style={styles.menu}>
          <Pressable onPress={pickPhoto} accessibilityRole="button" style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
            <View style={[styles.menuIcon, { backgroundColor: "#FFE3F2" }]}>
              <ImagePlus size={20} color="#6E2A50" strokeWidth={1.7} />
            </View>
            <Text style={styles.menuLabel}>Photo</Text>
          </Pressable>
          <Pressable onPress={pickDocument} accessibilityRole="button" style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
            <View style={[styles.menuIcon, { backgroundColor: "#ECE6FB" }]}>
              <FileText size={20} color={Violet[700]} strokeWidth={1.7} />
            </View>
            <Text style={styles.menuLabel}>Document</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bar}>
        {recording ? (
          <>
            <Pressable
              onPress={() => stopRecording(false)}
              accessibilityRole="button"
              accessibilityLabel="Annuler la note vocale"
              style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
            >
              <Trash2 size={20} color={Status.error} strokeWidth={1.7} />
            </Pressable>
            <View style={[styles.field, styles.recordingField]} accessibilityLiveRegion="polite">
              <View style={styles.recDot} />
              <Text style={styles.recTime}>{elapsed}</Text>
              <Text style={styles.recHint}>Enregistrement…</Text>
            </View>
            <Pressable
              onPress={() => stopRecording(true)}
              accessibilityRole="button"
              accessibilityLabel="Arrêter et envoyer la note vocale"
              style={({ pressed }) => [styles.send, pressed && styles.pressed]}
            >
              <Square size={16} color={Violet[900]} fill={Violet[900]} />
            </Pressable>
          </>
        ) : (
          <>
            {allowFiles && onAttach && !editing ? (
              <Pressable
                onPress={() => setMenuOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityLabel="Joindre une photo ou un document"
                accessibilityState={{ expanded: menuOpen }}
                style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
              >
                {menuOpen ? <X size={20} color={Violet[900]} strokeWidth={1.7} /> : <Plus size={20} color={Violet[900]} strokeWidth={1.7} />}
              </Pressable>
            ) : null}

            <TextInput
              value={value}
              onChangeText={onChangeText}
              onSelectionChange={(e) => setCaret(e.nativeEvent.selection.end)}
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

            {empty && !editing && onSendVoice && allowFiles ? (
              <Pressable
                onPress={startRecording}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer une note vocale"
                style={({ pressed }) => [styles.send, pressed && styles.pressed]}
              >
                <Mic size={20} color={Violet[900]} strokeWidth={1.8} />
              </Pressable>
            ) : (
              <Pressable
                onPress={onSend}
                disabled={!ready}
                accessibilityRole="button"
                accessibilityLabel={editing ? "Enregistrer la modification" : "Envoyer le message"}
                accessibilityState={{ disabled: !ready, busy: sending }}
                style={({ pressed }) => [styles.send, !ready && styles.sendDisabled, pressed && ready && styles.pressed]}
              >
                <Send size={20} color={ready ? Violet[900] : Violet[300]} strokeWidth={1.8} />
              </Pressable>
            )}
          </>
        )}
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
  readOnly: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    paddingHorizontal: GUTTER,
    paddingTop: Space.lg,
    backgroundColor: Surface.default,
    borderTopWidth: 1,
    borderTopColor: Border.hairline,
  },
  readOnlyText: { ...Type.label, color: Ink[500], textAlign: "center", flexShrink: 1 },
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
  thumbDoc: { alignItems: "center", justifyContent: "center", backgroundColor: Surface.default },
  menu: { flexDirection: "row", gap: Space.lg, paddingVertical: Space.xs },
  menuItem: { alignItems: "center", gap: 6 },
  menuIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  menuLabel: { ...Type.micro, color: Ink[900], fontFamily: Font.semibold },
  mentions: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
    gap: 2,
  },
  mentionsTitle: { ...Type.micro, fontFamily: Font.bold, color: Ink[500], letterSpacing: 0.8, marginHorizontal: 8, marginVertical: 4 },
  mentionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  mentionName: { ...Type.label, fontFamily: Font.semibold, color: Ink[900], flexShrink: 1 },
  titleTag: {
    fontSize: 9,
    fontFamily: Font.extrabold,
    color: Violet[700],
    backgroundColor: Violet[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    overflow: "hidden",
  },
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
  recordingField: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  recDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: Status.error },
  recTime: { ...Type.label, fontFamily: Font.semibold, color: Ink[900], fontVariant: ["tabular-nums"] },
  recHint: { ...Type.micro, color: Ink[500] },
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
