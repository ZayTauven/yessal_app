import React from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";

interface SuccessCelebrationProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export function SuccessCelebration({
  visible,
  onClose,
  title,
  message,
}: SuccessCelebrationProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Confetti Background */}
          <Image
            source={require("@/assets/images/confettis.png")}
            style={styles.confetti}
            contentFit="cover"
          />

          <View style={styles.iconWrap}>
            <Image
              source={require("@/assets/images/donner-de-lamour.png")}
              style={styles.icon}
              contentFit="contain"
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Button
            label="Super !"
            onPress={onClose}
            style={{ width: "100%", marginTop: 8 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(14, 24, 16, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  iconWrap: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  icon: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
});
