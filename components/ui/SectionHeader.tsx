import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
} from "react-native";
import { Colors } from "@/constants/colors";

const { width: W } = Dimensions.get("window");

type SectionHeaderAction = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: SectionHeaderAction[];
}

export function SectionHeader({ title, subtitle, icon, actions }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bgBase} />
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobRight} />
      <View style={styles.accentLine} />

      <View style={styles.content}>
        {icon && <View style={styles.iconBox}>{icon}</View>}
        <View style={styles.textColumn}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {actions?.length ? (
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                {action.icon}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: W,
    height: 174,
    justifyContent: "flex-end",
    paddingBottom: 24,
    paddingHorizontal: 24,
    overflow: "hidden",
    backgroundColor: "#FAF8F3",
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FAF8F3",
  },
  bgBlobLeft: {
    position: "absolute",
    top: -74,
    left: -74,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.accent.dim,
    opacity: 0.6,
  },
  bgBlobRight: {
    position: "absolute",
    top: 16,
    right: -96,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(184, 134, 11, 0.08)",
    opacity: 0.8,
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 24,
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.accent.DEFAULT,
    opacity: 0.9,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    zIndex: 10,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: Colors.accent.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  textColumn: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(26, 92, 58, 0.10)",
    boxShadow: "0 8px 18px rgba(16, 28, 18, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    marginTop: 2,
  },
});
