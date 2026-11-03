/**
 * AnonymeBadge — « Anonyme », posé à côté du VRAI nom d'un donateur anonyme.
 *
 * Le serveur ne laisse passer ce nom qu'à qui en a besoin (règle du
 * 2026-10-31, `voit_le_donateur` dans `contributions/serializers.py`) :
 * l'administration et Sangue Bi, le collecteur qui rencontre le membre, le
 * coordinateur devant une demande de collecte. Les autres lisent
 * « Contributeur anonyme » et n'ont rien à étiqueter.
 *
 * Sangue Bi annonce parfois le « Top 3 » d'un Ndiguel : sans l'étiquette,
 * rien ne l'empêchait de citer au Kourel quelqu'un qui avait demandé à rester
 * anonyme. Même dessin que `front-web/src/components/vireo/AnonymeBadge.tsx`.
 *
 * Teinte : l'avertissement à 8 % sur blanc, comme les pastilles d'état de
 * « Les Jëfs » (`${couleur}14`). Le libellé reste à 5,2:1.
 */
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { EyeOff } from "lucide-react-native";

import { Radius, Space, Status, UIType } from "@/theme";

export function AnonymeBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.badge, style]}
      accessibilityLabel="Anonyme : ce donateur a demandé à ne pas être cité"
    >
      <EyeOff size={11} color={Status.warning} strokeWidth={2} />
      <Text style={styles.label}>Anonyme</Text>
    </View>
  );
}

interface DonorNameProps {
  name: string;
  /** Vrai seulement quand le nom affiché est le vrai nom d'un anonyme. */
  anonyme: boolean;
  nameStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Le nom, puis l'étiquette. Le nom se coupe, jamais l'étiquette : un nom
 * tronqué reste lisible, un « Anon… » ne protège personne.
 */
export function DonorName({ name, anonyme, nameStyle, numberOfLines = 1, style }: DonorNameProps) {
  return (
    <View style={[styles.line, style]}>
      <Text style={[styles.name, nameStyle]} numberOfLines={numberOfLines}>
        {name}
      </Text>
      {anonyme ? <AnonymeBadge /> : null}
    </View>
  );
}

/**
 * Un Jëf de `/contributions/` dont le nom est révélé. Masqué, le serveur
 * remet `donor` à null (« Contributeur anonyme ») : rien à étiqueter.
 */
export function nomRevele(d: { is_anonymous?: boolean; donor?: number | null }): boolean {
  return Boolean(d.is_anonymous && d.donor != null);
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    backgroundColor: `${Status.warning}14`,
    flexShrink: 0,
  },
  label: { ...UIType.badgeLabel, color: Status.warning },

  line: { flexDirection: "row", alignItems: "center", gap: Space.xs + 2, minWidth: 0 },
  name: { flexShrink: 1 },
});
