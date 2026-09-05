/**
 * ChatRow — une ligne de la liste des conversations.
 *
 * Planche « Accueil et Onglets », vue `messagesFull` : avatar, nom, dernier
 * message tronqué à une ligne, puis une colonne de droite qui empile l'heure
 * et la pastille de non-lus. Séparateur à 8 % sous chaque ligne.
 *
 * La ligne n'est PAS une `Card` : la planche pose des rangées séparées par un
 * filet, pas des cartes espacées. C'est ce qui permet d'en voir sept sur un
 * petit écran là où l'ancien écran en montrait quatre.
 */
import { StyleSheet, Text, View, Pressable } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import type { Chat } from "@/types/content.types";
import {
  Border,
  Font,
  Ink,
  Radius,
  Type,
  UIType,
  Violet,
} from "@/theme";

/**
 * Au-delà, la pastille affiche « 99+ ». Trois chiffres élargiraient la
 * colonne de droite et rogneraient le dernier message.
 */
const UNREAD_CAP = 99;

interface ChatRowProps {
  chat: Chat;
  onPress: () => void;
}

export function ChatRow({ chat, onPress }: ChatRowProps) {
  const unread = chat.unread_count;
  const last = chat.last_message;

  /*
    Pas de repli inventé quand la conversation est vide : on le DIT. Écrire un
    faux dernier message ferait croire à un échange qui n'a pas eu lieu.
  */
  const preview = last?.content?.trim() || "Aucun message pour l'instant";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0
          ? `${chat.display_name}, ${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`
          : chat.display_name
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar uri={chat.avatar} name={chat.display_name} size={52} />

      <View style={styles.text}>
        <Text style={[styles.name, unread > 0 && styles.nameUnread]} numberOfLines={1}>
          {chat.display_name}
        </Text>
        <Text
          style={[styles.preview, unread > 0 && styles.previewUnread]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>

      <View style={styles.side}>
        <Text style={styles.time}>{formatRowTime(last?.sent_at)}</Text>
        {unread > 0 ? (
          <View style={styles.unread}>
            <Text style={styles.unreadLabel}>
              {unread > UNREAD_CAP ? `${UNREAD_CAP}+` : unread}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * L'heure du jour, la veille en toutes lettres, la date ensuite. C'est la
 * convention de toutes les messageries et elle évite « 09:10 » sur un message
 * de la semaine dernière.
 */
export function formatRowTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const days = daysBetween(date, new Date());
  if (days === 0) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Écart en jours CIVILS — 23 h 50 et 00 h 10 sont deux jours différents. */
export function daysBetween(from: Date, to: Date): number {
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Border.hairline,
  },
  pressed: { opacity: 0.72 },

  text: { flex: 1, minWidth: 0, gap: 3 },
  name: { ...UIType.rowTitle, color: Ink[900] },
  /** Un non-lu remonte le nom en violet : c'est la seule marque de la planche. */
  nameUnread: { color: Violet[900] },
  preview: { ...Type.label, color: Ink[500] },
  previewUnread: { fontFamily: Font.semibold, color: Ink[900] },

  side: { alignItems: "flex-end", gap: 6 },
  time: { ...Type.micro, color: Ink[300] },
  unread: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: Radius.chip,
    backgroundColor: Violet[300],
    alignItems: "center",
    justifyContent: "center",
  },
  /*
    Violet[900] sur Violet[300] — 6,20:1. Le blanc n'y tiendrait que 2,4:1 :
    c'est la même règle que le libellé du bouton principal.
  */
  unreadLabel: { ...UIType.badgeLabel, color: Violet[900] },
});
