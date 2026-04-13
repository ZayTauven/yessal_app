import React from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(26, 92, 58, 0.08)",
    padding: 16,
    boxShadow: "0 1px 2px rgba(14, 24, 16, 0.04)",
  },
});
