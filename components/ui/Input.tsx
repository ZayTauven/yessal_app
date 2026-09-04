/**
 * Input — libellé 12 / 500 au-dessus, champ de 56 au rayon 14.
 *
 * Planche « Composants ». Quatre états, et le libellé change de couleur avec
 * le champ — c'est ce qui rend l'erreur lisible sans lire le message :
 *
 *   repos      fond violet-100, sans filet, libellé encre secondaire
 *   focus      filet violet-500 à 1,5, libellé violet-700
 *   erreur     fond blanc, filet rouge à 1,5, libellé rouge, message dessous
 *   désactivé  fond gris de section, texte encre 100
 *
 * ⚠ Le filet de 1,5 est TOUJOURS rendu, transparent au repos. Sans cela le
 * texte saute de 1,5 px à la prise de focus.
 *
 * ⚠ Le message d'erreur est `selectable` — le brief l'impose : sur une 3G
 * intermittente, l'utilisateur recopie le message pour le signaler.
 */
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import {
  Border,
  Ink,
  Radius,
  Space,
  Status,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

interface InputProps extends TextInputProps {
  label?: string;
  /** Message d'erreur. Sa présence bascule tout le champ en état d'erreur. */
  error?: string;
  /** Précision sous le champ, quand il n'y a pas d'erreur. */
  hint?: string;
  /** Indicatif ou unité figée à gauche, séparée par un filet — « +221 ». */
  prefix?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  hint,
  prefix,
  icon,
  isPassword = false,
  disabled = false,
  containerStyle,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const state = error ? "error" : disabled ? "disabled" : focused ? "focus" : "rest";

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, LABEL[state]]}>{label}</Text> : null}

      <View style={[styles.field, FIELD[state]]}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}

        {prefix ? (
          <>
            <Text style={styles.prefix}>{prefix}</Text>
            <View style={styles.divider} />
          </>
        ) : null}

        <TextInput
          {...props}
          editable={!disabled && props.editable !== false}
          secureTextEntry={isPassword && !revealed}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={disabled ? Ink[100] : Ink[300]}
          style={[styles.input, disabled && styles.inputDisabled, props.style]}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
          >
            {revealed ? (
              <EyeOff size={20} color={Ink[500]} strokeWidth={1.5} />
            ) : (
              <Eye size={20} color={Ink[500]} strokeWidth={1.5} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.message, styles.messageError]} selectable>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.message}>{hint}</Text>
      ) : null}
    </View>
  );
}

type FieldState = "rest" | "focus" | "error" | "disabled";

const styles = StyleSheet.create({
  /**
   * La marge basse vient de l'ancien composant : huit écrans empilent des
   * champs sans `gap`. À retirer en phase F, quand les formulaires porteront
   * leur propre espacement.
   */
  container: { marginBottom: Space.lg, gap: 6 },
  label: Type.label,
  field: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: Radius.input,
    ...continuous,
    paddingHorizontal: Space.lg,
    gap: 10,
    borderWidth: 1.5,
  },
  icon: { opacity: 0.6 },
  prefix: { ...UIType.fieldPrefix, color: Violet[900] },
  divider: { width: 1, height: 20, backgroundColor: Border.strong },
  input: {
    flex: 1,
    height: "100%",
    ...UIType.fieldText,
    color: Ink[900],
    padding: 0,
  },
  inputDisabled: { color: Ink[100] },
  message: { ...Type.label, color: Ink[500] },
  messageError: { color: Status.error },
});

const FIELD: Record<FieldState, ViewStyle> = {
  rest: { backgroundColor: Violet[100], borderColor: "transparent" },
  focus: { backgroundColor: Violet[100], borderColor: Violet[500] },
  error: { backgroundColor: Surface.default, borderColor: Status.error },
  disabled: { backgroundColor: Surface.alt, borderColor: "transparent" },
};

const LABEL: Record<FieldState, { color: string }> = {
  rest: { color: Ink[500] },
  focus: { color: Violet[700] },
  error: { color: Status.error },
  disabled: { color: Ink[300] },
};
