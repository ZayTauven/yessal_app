/**
 * PinnedAnnouncement — l'annonce épinglée en tête du fil de groupe.
 *
 * Planche « Accueil et Onglets », vue `isGroupe` : bandeau violet-100, étoile,
 * « Annonce épinglée » puis le texte sur une ligne. Il ne défile pas avec le
 * fil — c'est ce qui en fait un épinglage et non un premier message.
 *
 * ── Ce qui y est épinglé ────────────────────────────────────────────────────
 *
 * `comms/announcements/` ne connaît pas la notion d'épinglage : `Announcement`
 * n'a ni champ `pinned` ni rattachement à une conversation. Le bandeau porte
 * donc la PLUS RÉCENTE annonce non expirée adressée au Daara de la
 * conversation — celles que le serveur a déjà filtrées pour cet utilisateur.
 *
 * Les annonces GLOBALES en sont exclues à dessein : ce bandeau est celui d'une
 * conversation de Daara, et une annonce nationale y prendrait la place de ce
 * que le chef a écrit à ses membres.
 *
 * ⚠ La raison invoquée ici jusqu'au 2026-09-05 était différente, et fausse :
 * « l'état vide de la liste des messages dit que les annonces publiques restent
 * dans l'onglet Accueil ». L'Accueil ne sert que des `NewsPost` ; il n'a jamais
 * affiché la moindre annonce. Entre cette exclusion et cette promesse en l'air,
 * une annonce globale n'était atteignable par aucun chemin. Elles se lisent
 * dans `/announcements`, vers où l'état vide renvoie désormais.
 */
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Star } from "lucide-react-native";

import type { Announcement } from "@/types/content.types";
import { Font, GUTTER, Space, Type, Violet } from "@/theme";

interface PinnedAnnouncementProps {
  announcement: Announcement;
  onPress: () => void;
}

export function PinnedAnnouncement({ announcement, onPress }: PinnedAnnouncementProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Annonce épinglée : ${announcement.title}`}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <Star size={18} color={Violet[700]} strokeWidth={1.6} />
      <View style={styles.text}>
        <Text style={styles.label}>Annonce épinglée</Text>
        {/*
          Une seule ligne, tronquée : le bandeau ne peut pas grandir sans
          manger le fil. L'annonce entière est à un appui, dans `/announcements`.
        */}
        <Text style={styles.body} numberOfLines={1}>
          {announcement.title}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Choisit l'annonce à épingler : la plus récente, non expirée, adressée au
 * Daara donné. Rend `null` quand il n'y en a aucune — le bandeau disparaît
 * alors entièrement plutôt que d'afficher un cadre vide.
 */
export function pickPinned(
  announcements: Announcement[],
  daaraId: number | null | undefined,
): Announcement | null {
  if (!daaraId) return null;
  const now = Date.now();

  const eligible = announcements.filter((item) => {
    if (item.daara !== daaraId) return false;
    if (!item.is_published) return false;
    if (!item.expires_at) return true;
    const expiry = new Date(item.expires_at).getTime();
    return Number.isNaN(expiry) || expiry > now;
  });

  /*
    Le serveur trie déjà par `-created_at`, mais un normalisateur n'a pas à
    dépendre de l'ordre d'une liste : on retrie, c'est une comparaison.
  */
  return (
    eligible.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: GUTTER,
    paddingVertical: Space.md,
    backgroundColor: Violet[100],
  },
  pressed: { opacity: 0.8 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  label: { ...Type.label, fontFamily: Font.bold, color: Violet[900] },
  body: { ...Type.label, fontFamily: Font.medium, color: Violet[700] },
});
