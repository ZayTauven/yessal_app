import { Pressable, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Les gestionnaires de `BottomTabBarButtonProps` sont `((e) => void) | null | undefined` :
 * le navigateur passe explicitement `null` quand un onglet n'a pas de gestionnaire.
 * Le type local doit donc accepter `null`, sinon expo-router refuse `tabBarButton`.
 */
type TabBarButtonProps = {
  onPress?:
    | ((e: GestureResponderEvent | React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void)
    | null;
  onPressIn?: ((e: GestureResponderEvent) => void) | null;
  onPressOut?: ((e: GestureResponderEvent) => void) | null;
  onLongPress?: ((e: GestureResponderEvent) => void) | null;
  children?: React.ReactNode;
  style?: any;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
  accessibilityLabel?: string;
  testID?: string;
};

export function HapticTab(props: TabBarButtonProps) {
  return (
    <Pressable
      {...(props as any)}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
