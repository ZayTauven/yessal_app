/**
 * La feuille d'actions d'un message — ouverte par un appui long sur la bulle.
 *
 * L'ancien fil n'offrait AUCUN geste : ni répondre, ni réagir, ni copier.
 * (L'appui long existait une fois, pour supprimer, et retirait la bulle sans
 * le dire au serveur — il avait été retiré pour cela.) Le geste revient, avec
 * ce que toute messagerie propose : une rangée de réactions rapides, puis
 * Répondre · Copier · Supprimer (ses propres messages seulement).
 *
 * Une feuille plutôt qu'un menu flottant : la cible fait toute la largeur, se
 * touche du pouce, et ne masque pas la bulle visée.
 */
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Copy, Pencil, Reply, Trash2 } from "lucide-react-native";

import type { Message } from "@/types/content.types";
import { Border, Font, GUTTER, HIT, Ink, Radius, Space, Status, Surface, Type, Violet } from "@/theme";

export const QUICK_REACTIONS = ["👍", "❤️", "🙏", "😂", "😮", "😢"];

interface MessageActionsProps {
  message: Message | null;
  canDelete: boolean;
  /** Son propre message texte : on peut le corriger. */
  canEdit?: boolean;
  /** Faux dans un canal : on n'y répond pas. */
  canReply?: boolean;
  bottomInset: number;
  onClose: () => void;
  onReact: (message: Message, emoji: string) => void;
  onReply: (message: Message) => void;
  onCopy: (message: Message) => void;
  onDelete: (message: Message) => void;
  onEdit?: (message: Message) => void;
}

export function MessageActions({
  message,
  canDelete,
  canEdit = false,
  canReply = true,
  bottomInset,
  onClose,
  onReact,
  onReply,
  onCopy,
  onDelete,
  onEdit,
}: MessageActionsProps) {
  const visible = !!message;
  const mineEmojis = new Set(message?.reactions.filter((r) => r.reacted_by_me).map((r) => r.emoji));

  const run = (fn: (m: Message) => void) => () => {
    if (!message) return;
    onClose();
    fn(message);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, Space.lg) }]}>
        <View style={styles.grip} />

        {message?.content && message.message_type === "text" ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {message.content}
          </Text>
        ) : null}

        <View style={styles.emojis}>
          {QUICK_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={run((m) => onReact(m, emoji))}
              accessibilityRole="button"
              accessibilityLabel={`Réagir ${emoji}`}
              accessibilityState={{ selected: mineEmojis.has(emoji) }}
              style={({ pressed }) => [
                styles.emoji,
                mineEmojis.has(emoji) && styles.emojiMine,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {canReply ? (
          <Action icon={<Reply size={20} color={Ink[900]} strokeWidth={1.7} />} label="Répondre" onPress={run(onReply)} />
        ) : null}
        {canEdit && onEdit ? (
          <Action icon={<Pencil size={20} color={Ink[900]} strokeWidth={1.7} />} label="Modifier" onPress={run(onEdit)} />
        ) : null}
        {message?.message_type === "text" ? (
          <Action icon={<Copy size={20} color={Ink[900]} strokeWidth={1.7} />} label="Copier le texte" onPress={run(onCopy)} />
        ) : null}
        {canDelete ? (
          <Action
            icon={<Trash2 size={20} color={Status.error} strokeWidth={1.7} />}
            label="Supprimer pour tout le monde"
            danger
            onPress={run(onDelete)}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function Action({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      {icon}
      <Text style={[styles.actionLabel, danger && styles.actionDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(16,10,32,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Surface.default,
    borderTopLeftRadius: Radius.card + 4,
    borderTopRightRadius: Radius.card + 4,
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    gap: Space.xs,
  },
  grip: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Border.strong,
    marginBottom: Space.sm,
  },
  excerpt: { ...Type.label, color: Ink[500], paddingBottom: Space.sm },
  emojis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Space.sm,
    marginBottom: Space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Border.hairline,
  },
  emoji: {
    width: HIT + 4,
    height: HIT + 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Surface.alt,
  },
  emojiMine: { backgroundColor: Violet[200] },
  emojiText: { fontSize: 24 },
  pressed: { transform: [{ scale: 0.92 }] },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.lg,
    minHeight: HIT + 8,
    paddingHorizontal: Space.xs,
    borderRadius: 12,
  },
  actionPressed: { backgroundColor: Surface.alt },
  actionLabel: { ...Type.body, fontFamily: Font.medium, color: Ink[900] },
  actionDanger: { color: Status.error },
});
