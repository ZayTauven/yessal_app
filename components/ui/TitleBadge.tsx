/**
 * TitleBadge — la pastille du titre honorifique.
 *
 * Retour de la réunion client : le titre (« Amir », « Serigne »…) doit se
 * voir, et se voir AVANT le nom — c'est ainsi qu'on désigne la personne dans
 * la communauté. Jusqu'ici il n'apparaissait qu'en sous-titre, et sur la ligne
 * d'annuaire il REMPLAÇAIT le rôle : un collecteur titré n'était plus lu comme
 * collecteur.
 *
 * Compacte, fond violet-100, label violet-900 (14,5:1 sur blanc, et le 100
 * n'y retire presque rien). Le même dessin que la pastille du tableau de bord
 * (`front-web/src/components/vireo/TitleBadge.tsx`), icône comprise : un
 * membre qui passe du web au téléphone doit reconnaître la même marque.
 *
 * Ne rend RIEN si le titre est vide ou blanc — `title_name` arrive souvent
 * `null`, parfois `""`. Une pastille vide serait une tache violette sans sens.
 *
 * `TitledName` pose la pastille et le nom sur une même ligne qui se replie
 * (`flexWrap`) : un nom long passe sous la pastille au lieu d'être tronqué ou
 * de pousser la mise en page hors de l'écran. Les trois emplacements qui la
 * portent — le tiroir, le Profil, Mon Daara — passent par lui, pour qu'un
 * réglage de l'alignement ne soit fait qu'une fois.
 */
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { BadgeCheck } from "lucide-react-native";

import { Radius, Space, UIType, Violet } from "@/theme";

interface TitleBadgeProps {
  title?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function TitleBadge({ title, style }: TitleBadgeProps) {
  const label = title?.trim();
  if (!label) return null;

  return (
    <View style={[styles.badge, style]} accessibilityLabel={`Titre : ${label}`}>
      <BadgeCheck size={12} color={Violet[900]} strokeWidth={2} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface TitledNameProps {
  title?: string | null;
  name: string;
  /** Le style du nom — chaque écran garde sa propre typographie. */
  nameStyle?: StyleProp<TextStyle>;
  /**
   * Deux lignes par défaut : assez pour un nom composé, pas assez pour
   * qu'un nom démesuré repousse tout l'en-tête.
   */
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}

/** La pastille du titre, puis le nom, sur une ligne qui se replie. */
export function TitledName({
  title,
  name,
  nameStyle,
  numberOfLines = 2,
  style,
}: TitledNameProps) {
  return (
    <View style={[styles.line, style]}>
      <TitleBadge title={title} />
      <Text style={[styles.name, nameStyle]} numberOfLines={numberOfLines}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.chip,
    backgroundColor: Violet[100],
    /* La pastille ne rétrécit jamais : c'est le nom qui se replie. */
    flexShrink: 0,
    maxWidth: "100%",
  },
  label: { ...UIType.badgeLabel, color: Violet[900], flexShrink: 1 },

  line: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 6,
    rowGap: 2,
  },
  /*
   * `flexShrink` + `maxWidth` : seul sur sa ligne, le nom se coupe dans la
   * largeur du bloc au lieu de déborder — `flexWrap` ne replie que les
   * enfants, pas le texte d'un enfant trop large.
   */
  name: { flexShrink: 1, maxWidth: "100%" },
});
