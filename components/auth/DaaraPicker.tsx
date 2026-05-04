import { Pressable, Text, View, StyleSheet, useColorScheme } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import type { DaaraOption } from "@/types";

interface DaaraPickerProps {
  value?: number;
  options: DaaraOption[];
  onChange: (daaraId: number) => void;
}

export function DaaraPicker({ value, options, onChange }: DaaraPickerProps) {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={styles.container}>
      {options.map((daara) => {
        const active = daara.id === value;
        return (
          <Pressable
            key={daara.id}
            onPress={() => onChange(daara.id)}
            style={[
              styles.item,
              isDark && styles.itemDark,
              active && styles.itemActive,
            ]}
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.name,
                    isDark && styles.textDark,
                    active && styles.textActive,
                  ]}
                  numberOfLines={1}
                >
                  {daara.name} ({daara.code} · {daara.ldd || "N/A"})
                </Text>
              </View>
              {active && (
                <CheckCircle2 size={18} color={Colors.accent.DEFAULT} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    backgroundColor: Colors.surface.subtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemDark: {
    backgroundColor: Colors.surface.card,
    borderColor: "rgba(255,255,255,0.1)",
  },
  itemActive: {
    borderColor: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent.dim,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.ink.DEFAULT,
  },
  textDark: {
    color: "#FFFFFF",
  },
  textActive: {
    color: Colors.accent.DEFAULT,
  },
  code: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  textMutedDark: {
    color: "rgba(255,255,255,0.5)",
  },
});
