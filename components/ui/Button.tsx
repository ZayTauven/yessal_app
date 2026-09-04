/**
 * Button — hauteur 52, capsule, libellé 15 / 700.
 *
 * Planche « Composants ». La règle des rôles de la rampe violette s'applique
 * ici et nulle part ailleurs avec autant de force :
 *
 *   primary    fond violet-300, libellé violet-900 — 6,20:1, AA
 *   secondary  fond gris de bouton, libellé encre
 *   outline    fond blanc, filet à 16 %, libellé violet-900
 *   ghost      sans fond, libellé violet-700
 *   désactivé  fond violet-100, libellé violet-300
 *
 * Pressé : opacité 0,72, SANS mise à l'échelle. Un bouton qui rétrécit sous le
 * doigt donne l'impression d'un décalage sur un écran tactile lent.
 *
 * Chargement : trois points qui respirent, pas de roue. La roue native change
 * d'aspect entre iOS et Android et casse la hauteur du bouton.
 */
import { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Border, HIT, Ink, Radius, Space, Surface, UIType, Violet } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "lg" | "md";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `lg` = 52 (le défaut du contrat) · `md` = 44, pour les paires en Card. */
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  style,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const tone = isDisabled ? DISABLED[variant] : TONES[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        tone.container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <LoadingDots color={tone.label.color} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              size === "lg" ? UIType.buttonLabel : UIType.buttonLabelSm,
              tone.label,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export type IconButtonTone = "neutral" | "accent" | "onPhoto";

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  /** Obligatoire : sans libellé visible, c'est la seule prise du lecteur d'écran. */
  accessibilityLabel: string;
  tone?: IconButtonTone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** `icon-only · 44 × 44` de la planche. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = "neutral",
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        ICON_TONES[tone],
        pressed && !disabled && styles.pressed,
        disabled && styles.iconDisabled,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const DOT_MS = 500;

function LoadingDot({ color, delay }: { color: string; delay: number }) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: DOT_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [delay, opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, pulse]} />;
}

function LoadingDots({ color }: { color: string }) {
  return (
    <View style={styles.dots} accessibilityLabel="Chargement">
      <LoadingDot color={color} delay={0} />
      <LoadingDot color={color} delay={200} />
      <LoadingDot color={color} delay={400} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.button,
    paddingHorizontal: Space.xxl,
    gap: Space.sm,
  },
  lg: { height: 52 },
  md: { height: HIT },
  fullWidth: { width: "100%" },
  pressed: { opacity: 0.72 },
  dots: { flexDirection: "row", gap: Space.sm },
  dot: { width: 8, height: 8, borderRadius: Radius.chip },
  iconButton: {
    width: HIT,
    height: HIT,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisabled: { opacity: 0.4 },
});

type Tone = { container: ViewStyle; label: { color: string } };

const TONES: Record<ButtonVariant, Tone> = {
  primary: {
    container: { backgroundColor: Violet[300] },
    label: { color: Violet[900] },
  },
  secondary: {
    container: { backgroundColor: Surface.btn },
    label: { color: Ink[900] },
  },
  outline: {
    container: {
      backgroundColor: Surface.default,
      borderWidth: 1,
      borderColor: Border.strong,
    },
    label: { color: Violet[900] },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    label: { color: Violet[700] },
  },
};

/**
 * Désactivé. Le contrat ne dessine que le cas `primary` — violet-100 sur
 * violet-300. Les trois autres le transposent : le fond perd son rôle, le
 * libellé descend en encre tertiaire.
 */
const DISABLED: Record<ButtonVariant, Tone> = {
  primary: {
    container: { backgroundColor: Violet[100] },
    label: { color: Violet[300] },
  },
  secondary: {
    container: { backgroundColor: Surface.btn },
    label: { color: Ink[300] },
  },
  outline: {
    container: {
      backgroundColor: Surface.default,
      borderWidth: 1,
      borderColor: Border.hairline,
    },
    label: { color: Ink[300] },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    label: { color: Ink[300] },
  },
};

const ICON_TONES: Record<IconButtonTone, ViewStyle> = {
  neutral: { backgroundColor: Surface.btn },
  accent: { backgroundColor: Violet[300] },
  onPhoto: { backgroundColor: "rgba(255,255,255,0.92)" },
};
