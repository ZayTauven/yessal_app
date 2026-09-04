/**
 * ScreenHeader — titre centré, deux actions de 44.
 *
 * Planche « Composants ». Rien d'autre : pas de dégradé, pas de blob, pas
 * d'ombre. L'ancien `SectionHeader` (174 px de haut, deux blobs verts et une
 * ligne d'accent) reste en place le temps que les treize écrans hérités
 * migrent — phase F.
 *
 * Le gabarit garde les deux emplacements de 44 même quand une seule action
 * existe : sans cela le titre se décale d'un écran à l'autre.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { IconButton, type IconButtonTone } from "./Button";
import { GUTTER, HIT, Ink, Space, UIType } from "@/theme";

export interface HeaderAction {
  icon: React.ReactNode;
  /** Obligatoire : c'est la seule prise du lecteur d'écran. */
  accessibilityLabel: string;
  onPress: () => void;
  tone?: IconButtonTone;
}

interface ScreenHeaderProps {
  title?: string;
  /** Raccourci du cas courant : un chevron de retour à gauche. */
  onBack?: () => void;
  left?: HeaderAction;
  right?: HeaderAction;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ title, onBack, left, right, style }: ScreenHeaderProps) {
  const leftAction: HeaderAction | undefined =
    left ??
    (onBack
      ? {
          icon: <ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />,
          accessibilityLabel: "Revenir",
          onPress: onBack,
        }
      : undefined);

  return (
    <View style={[styles.header, style]}>
      <Slot action={leftAction} />
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}
      <Slot action={right} />
    </View>
  );
}

function Slot({ action }: { action?: HeaderAction }) {
  if (!action) return <View style={styles.spacer} />;
  return (
    <IconButton
      icon={action.icon}
      onPress={action.onPress}
      accessibilityLabel={action.accessibilityLabel}
      tone={action.tone}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
    paddingHorizontal: GUTTER,
    paddingVertical: Space.sm,
  },
  title: { ...UIType.rowTitle, color: Ink[900], flex: 1, textAlign: "center" },
  spacer: { width: HIT, height: HIT },
});
