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
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Paperclip } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import type { Message } from "@/types/content.types";
import {
  Border,
  Font,
  Ink,
  Radius,
  Space,
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

interface MessageBubbleProps {
  message: Message;
  /** Émise par l'utilisateur courant : à droite, sur fond violet-300. */
  mine: boolean;
  /** Première bulle d'une suite du même auteur — porte le nom et le visage. */
  leading: boolean;
  /** Vrai en conversation de groupe : les bulles reçues sont signées. */
  group: boolean;
}

export function MessageBubble({ message, mine, leading, group }: MessageBubbleProps) {
  const author = message.sender;
  /* Le nom n'a de sens que sur ce que l'on REÇOIT, et seulement en groupe. */
  const showsAuthor = group && !mine && leading;
  const showsAvatar = group && !mine;

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

        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleOther,
            message.is_deleted && styles.bubbleDeleted,
          ]}
        >
          <Text
            style={[
              styles.text,
              mine ? styles.textMine : styles.textOther,
              message.is_deleted && styles.textDeleted,
            ]}
          >
            {message.content}
          </Text>

          {message.file_url && !message.is_deleted ? (
            <Attachment url={message.file_url} mine={mine} />
          ) : null}

          <Text style={[styles.time, mine ? styles.timeMine : styles.timeOther]}>
            {formatBubbleTime(message.sent_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Une pièce jointe s'ouvre dans l'application du système. Le fil ne prévisualise
 * rien : `MessageSerializer` ne dit pas de quel type est le fichier, et un
 * aperçu deviné qui ne s'affiche pas vaut moins qu'un lien qui s'ouvre.
 */
function Attachment({ url, mine }: { url: string; mine: boolean }) {
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
      <Text style={[styles.attachmentLabel, { color: tint }]}>Pièce jointe</Text>
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

  text: { ...Type.body },
  textMine: { color: Violet[900] },
  textOther: { color: Ink[900] },
  textDeleted: { fontStyle: "italic", color: Ink[300] },

  attachment: { flexDirection: "row", alignItems: "center", gap: 6 },
  attachmentLabel: { ...Type.label, fontFamily: Font.semibold },

  time: { ...Type.micro, alignSelf: "flex-end" },
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
