/**
 * ProgressBar — piste de 8, capsule, violet-100 ; remplissage violet-500.
 *
 * Planche « Composants », trois états :
 *
 *   normal    remplissage violet-500
 *   atteint   remplissage violet-700, plein — et le libellé de gauche passe
 *             au violet-700 : « Objectif atteint »
 *   masqué    LA PISTE RESTE DESSINÉE, VIDE. Elle n'est pas remplacée par un
 *             blanc. Un talibé doit voir qu'une progression existe et qu'elle
 *             ne lui est pas montrée — pas croire qu'il n'y en a pas.
 *
 * `onPhoto` est la variante posée sur une photographie : piste de 6, blanc à
 * 28 %, remplissage blanc. C'est celle de la CampaignCard.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ink, Radius, Space, Type, Violet } from "@/theme";

interface ProgressBarProps {
  /** 0 à 1. Borné par le composant. */
  progress?: number;
  variant?: "light" | "onPhoto";
  /** Rôle sans droit de regard sur les montants : piste vide, jamais absente. */
  hidden?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  progress = 0,
  variant = "light",
  hidden = false,
  leftLabel,
  rightLabel,
  style,
}: ProgressBarProps) {
  const ratio = Math.min(Math.max(progress, 0), 1);
  const reached = !hidden && ratio >= 1;
  const onPhoto = variant === "onPhoto";

  /* `label` et `showPercent`, legs de l'ancien composant, sont partis en
     phase F avec leurs trois derniers appelants. */
  const left = leftLabel;
  const right = rightLabel;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, onPhoto ? styles.trackOnPhoto : styles.trackLight]}>
        {hidden ? null : (
          <View
            style={[
              styles.fill,
              { width: `${ratio * 100}%` },
              onPhoto
                ? styles.fillOnPhoto
                : reached
                  ? styles.fillReached
                  : styles.fillLight,
            ]}
          />
        )}
      </View>

      {left || right ? (
        <View style={styles.captions}>
          <Text
            style={[
              styles.caption,
              onPhoto && styles.captionOnPhoto,
              reached && !onPhoto && styles.captionReached,
            ]}
            numberOfLines={1}
          >
            {left ?? ""}
          </Text>
          {right ? (
            <Text style={[styles.caption, onPhoto && styles.captionOnPhoto]}>
              {right}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: Space.md },
  track: {
    borderRadius: Radius.chip,
    overflow: "hidden",
  },
  trackLight: { height: 8, backgroundColor: Violet[100] },
  trackOnPhoto: { height: 6, backgroundColor: "rgba(255,255,255,0.28)" },
  fill: { height: "100%", borderRadius: Radius.chip },
  fillLight: { backgroundColor: Violet[500] },
  fillReached: { backgroundColor: Violet[700] },
  fillOnPhoto: { backgroundColor: "#FFFFFF" },
  captions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: Space.sm,
  },
  caption: { ...Type.label, color: Ink[500], flexShrink: 1 },
  captionReached: { color: Violet[700] },
  captionOnPhoto: { color: "rgba(255,255,255,0.82)" },
});
