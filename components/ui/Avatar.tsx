import React from "react";
import { View, Text } from "react-native";
import { Image as ExpoImage } from "expo-image";
import type { ViewStyle } from "react-native";

const PALETTE = [
  "#1A5C3A", "#2D7A4F", "#B8860B", "#6366F1",
  "#10B981", "#C97B1A", "#3B82F6", "#8B5CF6",
];

function colorFromName(name?: string) {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function Avatar({ uri, name, size = 44, style, borderRadius }: AvatarProps) {
  const radius = borderRadius ?? Math.round(size * 0.33);
  const color = colorFromName(name);
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.38);

  if (uri) {
    return (
      <ExpoImage
        source={{ uri }}
        style={[
          { width: size, height: size, borderRadius: radius },
          style && {
            overflow: (style.overflow === 'scroll' ? 'hidden' : style.overflow) as any,
            ...(({ overflow, ...rest }: any) => rest)(style),
          },
        ]}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: `${color}1E`,
          borderWidth: 1.5,
          borderColor: `${color}40`,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize,
          fontFamily: "Inter_700Bold",
          color,
          lineHeight: fontSize * 1.3,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
