/**
 * Toggle — l'interrupteur des Paramètres.
 *
 * **Le dix-huitième composant.** Le contrat de la phase B en comptait
 * dix-sept ; aucun n'était un interrupteur, parce qu'aucun écran refait
 * jusqu'ici n'en portait. La planche des Paramètres en aligne six.
 *
 * Pourquoi pas le `Switch` de React Native : il rend le commutateur du système
 * — vert sur iOS, à la couleur d'accent d'Android — et il n'accepte de teinte
 * que sur la piste. Six interrupteurs hors palette sur un écran de réglages,
 * c'est l'endroit précis où une application cesse d'avoir l'air d'elle-même.
 *
 * Piste 48 × 28, bouton 22, course de 20. La zone tactile est portée à 44 par
 * `hitSlop` plutôt que par la taille dessinée : le contrat impose 44 de prise,
 * pas 44 de pixels colorés.
 *
 * L'animation est un `withTiming` de 160 ms sur le fil natif — aucun rendu
 * React pendant la bascule.
 */
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";

import { HIT, Ink, Radius, Surface, Violet } from "@/theme";

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const KNOB = 22;
const INSET = (TRACK_HEIGHT - KNOB) / 2;
const TRAVEL = TRACK_WIDTH - KNOB - INSET * 2;
const DURATION = 160;

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Obligatoire : l'interrupteur n'a pas de libellé à lui. */
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  style,
}: ToggleProps) {
  /**
   * La position DÉRIVE de la valeur au lieu d'être poussée par un effet — le
   * React Compiler refuse un `setState` synchrone dans un effet, et une valeur
   * dérivée n'en a pas besoin. Elle suit aussi une valeur changée d'ailleurs :
   * quand le serveur refuse un réglage, l'appelant remet `value` et le bouton
   * revient tout seul.
   */
  const progress = useDerivedValue(() =>
    withTiming(value ? 1 : 0, { duration: DURATION }),
  );

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [Ink[100], Violet[700]],
    ),
  }));

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={(HIT - TRACK_HEIGHT) / 2}
      style={[disabled && styles.disabled, style]}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: Radius.chip,
    padding: INSET,
    justifyContent: "center",
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: Radius.avatar,
    backgroundColor: Surface.default,
  },
  /** Un réglage verrouillé par le Daara reste LISIBLE : il s'estompe, il ne disparaît pas. */
  disabled: { opacity: 0.4 },
});
