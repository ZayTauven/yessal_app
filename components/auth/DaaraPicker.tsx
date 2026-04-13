import { Pressable, Text, View, StyleSheet } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import type { DaaraOption } from "@/types";

interface DaaraPickerProps {
  value?: number;
  options: DaaraOption[];
  onChange: (daaraId: number) => void;
}

export function DaaraPicker({ value, options, onChange }: DaaraPickerProps) {
  return (
    <View style={styles.container}>
      {options.map((daara) => {
        const active = daara.id === value;
        return (
          <Pressable
            key={daara.id}
            onPress={() => onChange(daara.id)}
            style={[styles.item, active && styles.itemActive]}
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, active && styles.textActive]} numberOfLines={1}>
                  {daara.name}
                </Text>
                <Text style={styles.code} numberOfLines={1}>
                  Code {daara.code}
                </Text>
              </View>
              {active && <CheckCircle2 size={18} color={Colors.accent.DEFAULT} />}
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
});
