import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { X, Check } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import type { TitleOption } from "@/types";

interface TitleSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  titles: TitleOption[];
  onSelect: (titleId: number) => Promise<void>;
  currentTitle?: string | null;
}

export function TitleSelectionModal({
  visible,
  onClose,
  titles,
  onSelect,
  currentTitle,
}: TitleSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedId === null) {
      Alert.alert("Sélection requise", "Veuillez choisir un titre.");
      return;
    }

    setSubmitting(true);
    try {
      await onSelect(selectedId);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Demander un titre</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={Colors.ink.DEFAULT} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Choisissez le titre qui correspond le mieux à votre rôle dans la confrérie.
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {titles.map((title) => {
              const isActive = selectedId === title.id;
              const isCurrent = currentTitle === title.name;

              return (
                <Pressable
                  key={title.id}
                  onPress={() => setSelectedId(title.id)}
                  style={[
                    styles.item,
                    isActive && styles.itemActive,
                    isCurrent && styles.itemDisabled,
                  ]}
                  disabled={isCurrent}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text
                        style={[
                          styles.itemName,
                          isActive && styles.itemTextActive,
                          isCurrent && styles.itemTextDisabled,
                        ]}
                      >
                        {title.name}
                      </Text>
                      {title.description && (
                        <Text style={styles.itemDesc}>{title.description}</Text>
                      )}
                    </View>
                    {isActive && (
                      <Check size={20} color={Colors.accent.DEFAULT} />
                    )}
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Actuel</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Soumettre la demande"
              onPress={handleSubmit}
              loading={submitting}
              disabled={selectedId === null}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.surface.subtle,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 24,
  },
  list: {
    marginBottom: 24,
  },
  item: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    marginBottom: 12,
  },
  itemActive: {
    borderColor: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent.dim,
  },
  itemDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.surface.muted,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
  },
  itemTextActive: {
    color: Colors.accent.DEFAULT,
  },
  itemTextDisabled: {
    color: Colors.ink.faint,
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surface.muted,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
  },
  footer: {
    paddingBottom: 24,
  },
});
