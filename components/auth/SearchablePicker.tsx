import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  useColorScheme,
} from "react-native";
import { Search, X, CheckCircle2, ChevronDown } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Input } from "@/components/ui/Input";

interface Option {
  id: number;
  name: string;
  code?: string;
  [key: string]: any;
}

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  options: Option[];
  value?: number;
  onChange: (id: number) => void;
  loading?: boolean;
  error?: string;
}

export function SearchablePicker({
  label,
  placeholder,
  options,
  value,
  onChange,
  loading,
  error,
}: SearchablePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isDark = useColorScheme() === "dark";

  const selectedOption = options.find((o) => o.id === value);

  const filteredOptions = options.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      o.name?.toLowerCase().includes(q) ||
      o.code?.toLowerCase().includes(q)
    );
  });

  const handleSelect = (id: number) => {
    onChange(id);
    setModalVisible(false);
    setSearchQuery("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[
          styles.selector,
          isDark && styles.selectorDark,
          !!error && styles.selectorError,
        ]}
      >
        <Text style={[
          styles.selectorText,
          !selectedOption && styles.placeholderText,
          isDark && styles.textDark
        ]}>
          {selectedOption ? `${selectedOption.name} (${selectedOption.code || ""})` : placeholder}
        </Text>
        <ChevronDown size={18} color={Colors.ink.faint} />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDark && styles.textDark]}>{label}</Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <X size={24} color={isDark ? "#FFF" : Colors.ink.DEFAULT} />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              icon={<Search size={18} color={Colors.ink.faint} />}
            />
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const active = item.id === value;
              return (
                <Pressable
                  onPress={() => handleSelect(item.id)}
                  style={[
                    styles.item,
                    isDark && styles.itemDark,
                    active && styles.itemActive,
                  ]}
                >
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.itemName,
                        isDark && styles.textDark,
                        active && styles.textActive
                      ]}>
                        {item.name}
                      </Text>
                      {item.code && (
                        <Text style={styles.itemCode}>{item.code}</Text>
                      )}
                    </View>
                    {active && (
                      <CheckCircle2 size={20} color={Colors.accent.DEFAULT} />
                    )}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun résultat trouvé.</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.ink.muted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface.subtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorDark: {
    backgroundColor: Colors.surface.card,
    borderColor: "rgba(255,255,255,0.1)",
  },
  selectorError: {
    borderColor: Colors.status.error,
  },
  selectorText: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  placeholderText: {
    color: Colors.ink.faint,
  },
  textDark: {
    color: "#FFFFFF",
  },
  textActive: {
    color: Colors.accent.DEFAULT,
  },
  errorText: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 6,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalContainerDark: {
    backgroundColor: "#121212",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.DEFAULT,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  item: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.DEFAULT,
  },
  itemDark: {
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  itemActive: {
    backgroundColor: Colors.accent.dim,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
  },
  itemCode: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
});
