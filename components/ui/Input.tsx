// components/ui/Input.tsx
import { useState } from "react";
import { View, TextInput, Text, Pressable, TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Colors } from "@/constants/colors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  icon,
  isPassword = false,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error
    ? Colors.status.error
    : focused
      ? Colors.accent.DEFAULT
      : Colors.border.DEFAULT;

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-ink-muted text-xs font-medium mb-2 tracking-wide">
          {label}
        </Text>
      )}

      <View
        style={{ borderColor, borderWidth: 0.5 }}
        className="flex-row items-center bg-surface-subtle rounded-xl px-3 gap-2"
      >
        {icon && <View className="opacity-50">{icon}</View>}

        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={Colors.ink.faint}
          className="flex-1 py-[11px] text-ink text-[14px]"
          style={{ fontFamily: "Inter_400Regular" }}
        />

        {isPassword && (
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            {showPassword ? (
              <EyeOff size={16} color={Colors.ink.faint} />
            ) : (
              <Eye size={16} color={Colors.ink.faint} />
            )}
          </Pressable>
        )}
      </View>

      {error && (
        <Text
          className="text-[12px] mt-1"
          style={{ color: Colors.status.error }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
