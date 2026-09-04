/**
 * Avatar — 44 par défaut, capsule, repli sur les initiales.
 *
 * Planche « Composants » : photo ronde ; à défaut, fond violet-100, filet
 * violet-200 à 1,5, initiales violet-700 à 0,36 × la taille.
 *
 * Le repli ne tire plus sa couleur d'un hachage du nom — la palette de huit
 * teintes de l'ancien composant sortait du système. Le violet est constant :
 * c'est un repli, pas une identité.
 */
import { Image as ExpoImage } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Radius, Space, Surface, UIType, Violet } from "@/theme";

/** Recouvrement d'une pile — un tiers de la taille, comme sur la planche. */
const STACK_OVERLAP_RATIO = 1 / 3;

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  /** Dérogation à la capsule. Les écrans hérités demandent encore des carrés. */
  borderRadius?: number;
  /** Anneau blanc — pour poser l'avatar sur une photographie ou dans une pile. */
  ringed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({
  uri,
  name,
  size = 44,
  borderRadius,
  ringed = false,
  style,
}: AvatarProps) {
  const radius = borderRadius ?? Radius.avatar;
  const ring: ViewStyle | null = ringed
    ? { borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" }
    : null;
  const box: ViewStyle = { width: size, height: size, borderRadius: radius };

  /**
   * La photographie est enveloppée plutôt que stylée directement : `expo-image`
   * attend un `ImageStyle`, que `ViewStyle` ne satisfait pas (`overflow: scroll`
   * n'y existe pas). L'enveloppe porte la géométrie et l'anneau — ils sont donc
   * rendus à l'identique dans les deux branches, ce qu'un cast n'aurait pas
   * garanti.
   */
  if (uri) {
    return (
      <View style={[styles.imageWrap, box, ring, style]}>
        <ExpoImage
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
        />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, box, ring, style]}>
      <Text
        style={[
          UIType.avatarInitials,
          { fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.45) },
          styles.initials,
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

export interface StackedPerson {
  uri?: string | null;
  name?: string | null;
}

interface AvatarStackProps {
  people: StackedPerson[];
  /** 36 sur la planche des composants, 28 sur la CampaignCard. */
  size?: number;
  /** Nombre de visages affichés avant la pastille de reste. */
  max?: number;
  /**
   * Effectif total. S'il dépasse le nombre de visages, une pastille
   * violet-900 « +N » ferme la pile.
   */
  total?: number;
  ringed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AvatarStack({
  people,
  size = 36,
  max = 3,
  total,
  ringed = true,
  style,
}: AvatarStackProps) {
  const shown = people.slice(0, max);
  const rest = (total ?? people.length) - shown.length;
  const overlap = -Math.round(size * STACK_OVERLAP_RATIO);

  return (
    <View style={[styles.stack, style]}>
      {shown.map((person, index) => (
        <Avatar
          key={`${person.uri ?? person.name ?? "anon"}-${index}`}
          uri={person.uri}
          name={person.name}
          size={size}
          ringed={ringed}
          style={index > 0 ? { marginLeft: overlap } : undefined}
        />
      ))}
      {rest > 0 ? (
        <View
          style={[
            styles.rest,
            { width: size, height: size, marginLeft: shown.length > 0 ? overlap : 0 },
            ringed && styles.restRing,
          ]}
        >
          <Text style={styles.restLabel}>+{rest}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: { backgroundColor: Violet[100], overflow: "hidden" },
  fallback: {
    backgroundColor: Violet[100],
    borderWidth: 1.5,
    borderColor: Violet[200],
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: Violet[700] },
  stack: { flexDirection: "row", alignItems: "center" },
  rest: {
    borderRadius: Radius.avatar,
    backgroundColor: Violet[900],
    alignItems: "center",
    justifyContent: "center",
  },
  restRing: { borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
  restLabel: { ...UIType.badgeLabel, color: Surface.default, paddingHorizontal: Space.xs },
});
