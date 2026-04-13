// components/ui/Button.tsx
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";

type Variant = "primary" | "ghost" | "outline";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    "flex-row items-center justify-center rounded-xl px-6 py-[13px] gap-2";

  const styles: Record<Variant, string> = {
    primary: "bg-accent",
    ghost: "bg-transparent",
    outline: "bg-transparent border border-border-medium",
  };

  const textStyles: Record<Variant, string> = {
    primary: "text-white font-medium text-[15px]",
    ghost: "text-ink-muted font-normal text-[15px]",
    outline: "text-ink-muted font-normal text-[14px]",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [{ opacity: pressed || isDisabled ? 0.72 : 1 }, style]}
      className={`${base} ${styles[variant]} ${fullWidth ? "w-full" : ""}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#fff" : Colors.accent.DEFAULT}
          size="small"
        />
      ) : (
        <>
          {icon && <View>{icon}</View>}
          <Text className={textStyles[variant]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
