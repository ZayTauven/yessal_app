/**
 * L'icône d'un fil. Les canaux en reçoivent une, choisie par l'administration
 * dans une liste FERMÉE — la même côté serveur (`comms/audience.ICONES`) et
 * côté web (`(messagerie)/dashboard/chat/ChannelIcons.tsx`).
 */
import { createElement } from "react";
import {
  BellRing,
  BookOpen,
  CalendarDays,
  GraduationCap,
  HandHeart,
  Hash,
  Heart,
  Landmark,
  Megaphone,
  Moon,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react-native";

import type { Chat } from "@/types/content.types";

const ICONES: Record<string, LucideIcon> = {
  megaphone: Megaphone,
  "hand-heart": HandHeart,
  "book-open": BookOpen,
  calendar: CalendarDays,
  users: Users,
  star: Star,
  bell: BellRing,
  heart: Heart,
  "graduation-cap": GraduationCap,
  sparkles: Sparkles,
  moon: Moon,
  landmark: Landmark,
};

/** L'icône d'un fil : celle que l'admin a choisie, sinon celle de son type. */
export function chatIcon(chat: Pick<Chat, "chat_type" | "channel_kind" | "icon">): LucideIcon {
  if (chat.icon && ICONES[chat.icon]) return ICONES[chat.icon];
  if (chat.channel_kind === "jefs") return HandHeart;
  if (chat.chat_type === "channel") return Megaphone;
  return Hash;
}

/**
 * L'icône dessinée. `createElement` plutôt qu'une variable composant : le
 * compilateur React refuse un composant choisi pendant le rendu.
 */
export function ChannelGlyph({
  chat,
  size,
  color,
  strokeWidth = 1.7,
}: {
  chat: Pick<Chat, "chat_type" | "channel_kind" | "icon">;
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  return createElement(chatIcon(chat), { size, color, strokeWidth });
}
