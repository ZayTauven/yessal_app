// components/ui/Select.tsx
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Colors } from "@/constants/colors";

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Select({
  label,
  value,
  options,
  onSelect,
  placeholder = "Sélectionner...",
  disabled = false,
}: SelectProps) {
  const selectedOption = options.find((o) => o.value === value);

  const handlePress = () => {
    if (disabled) return;

    Alert.alert(
      label,
      "Choisissez une option :",
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => onSelect(o.value),
          style: o.value === value ? ("default" as const) : ("default" as const),
        })),
        { text: "Annuler", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.selector,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.value, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={18} color={Colors.ink.faint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: "100%",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.7,
    borderColor: Colors.accent.DEFAULT,
  },
  disabled: {
    backgroundColor: Colors.surface.muted,
    opacity: 0.6,
  },
  value: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.ink.DEFAULT,
  },
  placeholder: {
    color: Colors.ink.faint,
  },
});
