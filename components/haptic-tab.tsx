import { Pressable, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";

type TabBarButtonProps = {
  onPress?: (e: GestureResponderEvent | React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  onPressIn?: (e: GestureResponderEvent) => void;
  onPressOut?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
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
