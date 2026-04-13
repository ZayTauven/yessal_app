import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

interface ProgressBarProps {
  progress: number; // 0 to 1
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({ progress, label, showPercent = true }: ProgressBarProps) {
  const percentage = Math.min(Math.max(progress, 0), 1) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {label && <Text style={styles.label}>{label}</Text>}
        {showPercent && (
          <Text style={styles.percentText}>{Math.round(percentage)}%</Text>
        )}
      </View>
      <View style={styles.track}>
        <View 
          style={[
            styles.fill, 
            { width: `${percentage}%` },
            percentage >= 90 ? { backgroundColor: Colors.status.success } : null
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  percentText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  track: {
    height: 10,
    backgroundColor: "rgba(26, 92, 58, 0.08)",
    borderRadius: 10,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: 10,
  },
});
