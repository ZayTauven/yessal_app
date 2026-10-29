/**
 * Le fil d'une conversation : la bulle, le séparateur de jour, la note système.
 *
 * Planche « Accueil et Onglets », vues `isChat` et `isGroupe`. Trois pièces
 * seulement, parce que le fil n'en contient que trois — le reçu de Jëf a son
 * propre fichier, il n'est pas une bulle.
 *
 * ── Ce que la variante de groupe ajoute ─────────────────────────────────────
 *
 * L'avatar de l'auteur et son nom au-dessus de la bulle. Les deux
 * n'apparaissent que sur la PREMIÈRE bulle d'une suite du même auteur : quatre
 * messages consécutifs de Serigne Modou n'ont pas besoin de quatre portraits.
 * En tête-à-tête, ni l'un ni l'autre — on sait à qui l'on parle.
 */
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, Ban, Check, CheckCheck, Paperclip } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import type { Message } from "@/types/content.types";
import {
  Border,
  Font,
  Ink,
  Radius,
  Space,
  Status,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

/**
 * Le coin « bec » de la bulle, du côté de son auteur — 6 sur la planche.
 * Les trois autres coins prennent `Radius.card`.
 */
const BEAK = 6;
/** Largeur maximale d'une bulle, mesurée sur la planche. */
const BUBBLE_MAX = "78%";
/** Diamètre de l'avatar d'auteur en conversation de groupe. */
const AUTHOR_AVATAR = 30;
/** Vignette d'image dans le fil. */
const THUMB_W = 220;
const THUMB_H = 200;

interface MessageBubbleProps {
  message: Message;
  /** Émise par l'utilisateur courant : à droite, sur fond violet-300. */
  mine: boolean;
  /** Première bulle d'une suite du même auteur — porte le nom et le visage. */
  leading: boolean;
  /** Vrai en conversation de groupe : les bulles reçues sont signées. */
  group: boolean;
  /** Tête-à-tête : l'autre a lu jusqu'ici (double coche). */
  seen?: boolean;
  /** Appui long — ouvre la feuille d'actions (répondre, réagir, copier…). */
  onLongPress?: (message: Message) => void;
  onToggleReaction?: (message: Message, emoji: string) => void;
  onOpenImage?: (message: Message) => void;
  onRetry?: (message: Message) => void;
}

export function MessageBubble({
  message,
  mine,
  leading,
  group,
  seen = false,
  onLongPress,
  onToggleReaction,
  onOpenImage,
  onRetry,
}: MessageBubbleProps) {
  const author = message.sender;
  /* Le nom n'a de sens que sur ce que l'on REÇOIT, et seulement en groupe. */
  const showsAuthor = group && !mine && leading;
  const showsAvatar = group && !mine;
  const isImage = message.message_type === "file" && message.file_is_image && !message.is_deleted;
  const imageUri = message.local?.imageUri ?? message.file_url;
  /* Une pièce jointe sans légende porte son nom de fichier en `content` : on ne le répète pas. */
  const caption =
    message.message_type === "file" && message.content === message.file_name ? "" : message.content;
  const actionable = !message.is_deleted && !message.local;

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      {showsAvatar ? (
        leading ? (
          <Avatar uri={author?.avatar} name={author?.name} size={AUTHOR_AVATAR} />
        ) : (
          /* Une cale de la largeur du visage : les bulles d'une suite restent alignées. */
          <View style={styles.avatarSpacer} />
        )
      ) : null}

      <View style={[styles.column, mine && styles.columnMine]}>
        {showsAuthor && author?.name ? (
          <Text style={styles.author} numberOfLines={1}>
            {author.name}
          </Text>
        ) : null}

        <Pressable
          onLongPress={() => actionable && onLongPress?.(message)}
          delayLongPress={280}
          accessibilityHint={actionable ? "Appui long pour répondre ou réagir" : undefined}
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleOther,
            message.is_deleted && styles.bubbleDeleted,
            isImage && styles.bubbleImage,
            message.local?.status === "sending" && styles.bubbleSending,
          ]}
        >
          {message.is_deleted ? (
            <View style={styles.deletedRow}>
              <Ban size={13} color={Ink[300]} strokeWidth={1.8} />
              <Text style={[styles.text, styles.textDeleted]}>Message supprimé</Text>
            </View>
          ) : (
            <>
              {message.reply_preview ? (
                <View style={[styles.quote, mine && styles.quoteMine]}>
                  <Text style={styles.quoteAuthor} numberOfLines={1}>
                    {message.reply_preview.sender_name}
                  </Text>
                  <Text style={styles.quoteBody} numberOfLines={2}>
                    {message.reply_preview.content}
                  </Text>
                </View>
              ) : null}

              {isImage && imageUri ? (
                <Pressable
                  onPress={() => actionable && onOpenImage?.(message)}
                  onLongPress={() => actionable && onLongPress?.(message)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Agrandir l'image"
                >
                  <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
                </Pressable>
              ) : null}

              {caption ? (
                <Text
                  style={[
                    styles.text,
                    mine ? styles.textMine : styles.textOther,
                    isImage && styles.captionPad,
                  ]}
                >
                  {highlight(caption, mine)}
                </Text>
              ) : null}

              {message.file_url && !isImage ? (
                <Attachment url={message.file_url} name={message.file_name} mine={mine} />
              ) : null}
            </>
          )}

          <View style={[styles.meta, isImage && styles.captionPad]}>
            <Text style={[styles.time, mine ? styles.timeMine : styles.timeOther]}>
              {formatBubbleTime(message.sent_at)}
            </Text>
            {mine && !message.is_deleted ? (
              message.local?.status === "sending" ? (
                <ActivityIndicator size={10} color={Violet[700]} />
              ) : message.local?.status === "failed" ? null : seen ? (
                <CheckCheck size={13} color={Violet[900]} strokeWidth={2} accessibilityLabel="Lu" />
              ) : (
                <Check size={13} color={Violet[700]} strokeWidth={2} accessibilityLabel="Envoyé" />
              )
            ) : null}
          </View>
        </Pressable>

        {message.local?.status === "failed" ? (
          <Pressable
            onPress={() => onRetry?.(message)}
            hitSlop={Space.sm}
            style={styles.failed}
            accessibilityRole="button"
          >
            <AlertCircle size={13} color={Status.error} strokeWidth={1.8} />
            <Text style={styles.failedLabel}>Non envoyé · Toucher pour réessayer</Text>
          </Pressable>
        ) : null}

        {message.reactions.length > 0 && !message.is_deleted ? (
          <View style={[styles.reactions, mine && styles.reactionsMine]}>
            {message.reactions.map((r) => (
              <Pressable
                key={r.emoji}
                onPress={() => onToggleReaction?.(message, r.emoji)}
                accessibilityRole="button"
                accessibilityState={{ selected: r.reacted_by_me }}
                accessibilityLabel={`${r.emoji} ${r.count}`}
                style={[styles.reaction, r.reacted_by_me && styles.reactionMine]}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                {r.count > 1 ? <Text style={styles.reactionCount}>{r.count}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Les « @Prénom » ressortent : c'est ce qui fait sonner un téléphone en grand salon. */
function highlight(text: string, mine: boolean) {
  const parts = text.split(/(@[\p{L}][\p{L}'-]*)/u);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <Text key={i} style={[styles.mention, mine && styles.mentionMine]}>
        {part}
      </Text>
    ) : (
      part
    ),
  );
}

/**
 * Une pièce jointe s'ouvre dans l'application du système. Le fil ne prévisualise
 * rien : `MessageSerializer` ne dit pas de quel type est le fichier, et un
 * aperçu deviné qui ne s'affiche pas vaut moins qu'un lien qui s'ouvre.
 */
function Attachment({ url, name, mine }: { url: string; name?: string | null; mine: boolean }) {
  /*
    Violet[700] ne tient que 2,1:1 sur le violet-300 de la bulle émise. Le
    libellé y descend donc d'un cran, comme le fait le label du bouton primaire.
  */
  const tint = mine ? Violet[900] : Violet[700];
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityLabel="Ouvrir la pièce jointe"
      hitSlop={Space.sm}
      style={styles.attachment}
    >
      <Paperclip size={14} color={tint} strokeWidth={1.6} />
      <Text style={[styles.attachmentLabel, { color: tint }]} numberOfLines={1}>
        {name || "Pièce jointe"}
      </Text>
    </Pressable>
  );
}

/**
 * Le séparateur de jour — « Aujourd'hui » sur la planche, et la date au-delà.
 * Il ne s'insère qu'entre deux jours, jamais en tête d'un fil d'un seul jour…
 * sauf le premier, qui donne le repère.
 */
export function DayDivider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <Text style={styles.dividerLabel}>{label}</Text>
    </View>
  );
}

/**
 * Un message `system` — « Discussion directe démarrée. », posé par le serveur
 * à l'acceptation d'une invitation (`comms/views.py:320`). Ce n'est pas la
 * parole de quelqu'un : il ne prend donc pas de bulle, pas d'auteur, pas
 * d'heure. Même forme que le séparateur de jour, dont il partage le rôle.
 */
export function SystemNote({ content }: { content: string }) {
  return (
    <View style={styles.dividerRow}>
      <Text style={styles.systemLabel}>{content}</Text>
    </View>
  );
}

/** « 09:10 ». Le jour est porté par le séparateur, pas par chaque bulle. */
export function formatBubbleTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: Space.sm },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  avatarSpacer: { width: AUTHOR_AVATAR },

  column: { maxWidth: BUBBLE_MAX, gap: Space.xs },
  columnMine: { alignItems: "flex-end" },
  author: { ...Type.micro, fontFamily: Font.semibold, color: Ink[500], marginLeft: Space.sm },

  bubble: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    gap: 6,
    ...continuous,
  },
  bubbleMine: {
    backgroundColor: Violet[300],
    borderRadius: Radius.card,
    borderBottomRightRadius: BEAK,
  },
  bubbleOther: {
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
    borderRadius: Radius.card,
    borderBottomLeftRadius: BEAK,
  },
  /* Un message supprimé garde sa place mais perd sa couleur : la trace reste. */
  bubbleDeleted: { backgroundColor: Surface.btn, borderColor: "transparent" },
  bubbleImage: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: Space.sm },
  bubbleSending: { opacity: 0.7 },
  deletedRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  quote: {
    borderLeftWidth: 3,
    borderLeftColor: Violet[500],
    backgroundColor: Violet[100],
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 1,
  },
  quoteMine: { backgroundColor: "rgba(255,255,255,0.45)" },
  quoteAuthor: { ...Type.micro, fontFamily: Font.semibold, color: Violet[700] },
  quoteBody: { ...Type.micro, color: Ink[500] },

  thumb: { width: THUMB_W, height: THUMB_H, borderRadius: Radius.card - 4, backgroundColor: Surface.btn },
  captionPad: { paddingHorizontal: Space.md - 4 },
  meta: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 4 },

  mention: { fontFamily: Font.semibold, color: Violet[700] },
  mentionMine: { color: Violet[900] },

  failed: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Space.xs },
  failedLabel: { ...Type.micro, color: Status.error, fontFamily: Font.semibold },

  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: -2, paddingHorizontal: Space.sm },
  reactionsMine: { justifyContent: "flex-end" },
  reaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  reactionMine: { backgroundColor: Violet[100], borderColor: Violet[300] },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { ...Type.micro, color: Ink[500], fontFamily: Font.semibold },

  text: { ...Type.body },
  textMine: { color: Violet[900] },
  textOther: { color: Ink[900] },
  textDeleted: { fontStyle: "italic", color: Ink[300] },

  attachment: { flexDirection: "row", alignItems: "center", gap: 6 },
  attachmentLabel: { ...Type.label, fontFamily: Font.semibold },

  time: { ...Type.micro },
  timeMine: { color: Violet[700] },
  timeOther: { color: Ink[300] },

  dividerRow: { alignItems: "center" },
  dividerLabel: {
    ...UIType.badgeLabel,
    color: Ink[500],
    backgroundColor: Surface.btn,
    paddingHorizontal: Space.md,
    paddingVertical: 5,
    borderRadius: Radius.chip,
    overflow: "hidden",
  },
  systemLabel: {
    ...Type.micro,
    color: Ink[300],
    textAlign: "center",
    paddingHorizontal: Space.lg,
  },
});
