/**
 * ProfileCompletionBanner — l'alerte persistante du profil incomplet.
 *
 * Règle de produit Yessal, déjà tenue par `front-web` : elle reste affichée
 * jusqu'à ce que le membre ait renseigné son profil. Voir
 * `lib/profile-completion.ts` pour les sept critères et pour l'écart, assumé,
 * avec le bandeau du web.
 *
 * ── Persistante, donc pas de bouton pour la fermer ─────────────────────────
 *
 * C'est le sens du mot. Une croix en ferait un rappel qu'on écarte une fois et
 * qu'on ne revoit plus, ce qui reviendrait à ne pas l'afficher.
 *
 * ── Mais elle n'occupe pas la place d'un contenu ───────────────────────────
 *
 * Le ton est violet et non rouge : un profil incomplet n'est pas une panne,
 * c'est une chose à faire. Le rouge est réservé à ce qui a échoué — un
 * paiement, une pièce refusée — et perdrait son sens à servir ici.
 *
 * Elle dit CE QUI MANQUE plutôt que combien : « 2 informations manquantes »
 * fait ouvrir l'écran pour découvrir lesquelles.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertCircle, ChevronRight } from "lucide-react-native";

import {
  missingSummary,
  type CompletionState,
} from "@/lib/profile-completion";
import {
  GUTTER,
  Ink,
  Radius,
  Space,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

interface ProfileCompletionBannerProps {
  state: CompletionState | null;
  /** `true` sur le Profil, où le bandeau n'a pas à répéter la gouttière. */
  flush?: boolean;
}

export function ProfileCompletionBanner({
  state,
  flush = false,
}: ProfileCompletionBannerProps) {
  const router = useRouter();

  /* `null` : la complétude n'est pas connue — on ne reproche rien à l'aveugle. */
  if (!state || state.complete) return null;

  /**
   * La destination est celle du PREMIER manque, pas une page d'index : un
   * membre à qui il ne manque qu'une pièce d'identité n'a rien à faire sur le
   * formulaire d'état civil.
   */
  const cible = state.missing[0].route;

  return (
    <Pressable
      onPress={() => router.push(cible)}
      accessibilityRole="button"
      accessibilityLabel={`Compléter votre profil. Il manque ${missingSummary(state.missing)}.`}
      style={({ pressed }) => [
        styles.banner,
        !flush && styles.gutter,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.icon}>
        <AlertCircle size={18} color={Violet[900]} strokeWidth={1.75} />
      </View>

      <View style={styles.text}>
        <Text style={styles.title}>Complétez votre profil</Text>
        <Text style={styles.body}>Il manque {missingSummary(state.missing)}.</Text>
      </View>

      <ChevronRight size={18} color={Violet[700]} strokeWidth={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.lg,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Violet[100],
  },
  gutter: { marginHorizontal: GUTTER },
  pressed: { opacity: 0.8 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.chip,
    backgroundColor: Violet[200],
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: { ...UIType.rowTitle, color: Violet[900] },
  body: { ...Type.label, color: Ink[500] },
});
