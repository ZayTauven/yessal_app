/**
 * SearchablePicker — le choix dans une liste longue, passé au système (phase F).
 *
 * Employé par l'inscription pour la localité (LDD) et le Daara : deux listes
 * qui peuvent compter des centaines d'entrées, d'où la recherche.
 *
 * ── 🔴 Le seul écran sombre du produit ──────────────────────────────────────
 *
 * Le composant lisait `useColorScheme()` et basculait sur `#121212`, texte
 * blanc, bordures à 10 % de blanc. **Rien d'autre dans l'application ne fait
 * cela** : `app/_layout.tsx` fixe `<StatusBar style="dark" />`, les tokens ne
 * définissent aucune palette sombre, et tous les écrans sont clairs. Sur un
 * téléphone réglé en sombre — le réglage par défaut d'une bonne partie du parc
 * Android — le formulaire d'inscription ouvrait donc une feuille noire au
 * milieu d'un parcours blanc.
 *
 * Le mode sombre est retiré. Il reviendra le jour où les tokens en portent un,
 * et il reviendra alors partout à la fois.
 *
 * ── « Touba () » ────────────────────────────────────────────────────────────
 *
 * `${name} (${code || ""})` affichait une parenthèse vide pour toute entrée
 * sans code. La parenthèse ne s'écrit plus que s'il y a quelque chose dedans.
 */
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronDown, Search, X } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  Border,
  GUTTER,
  Ink,
  Radius,
  Space,
  Status,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

export interface PickerOption {
  id: number;
  name: string;
  code?: string;
}

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  options: PickerOption[];
  value?: number;
  onChange: (id: number) => void;
  loading?: boolean;
  error?: string;
}

function describe(option: PickerOption) {
  return option.code ? `${option.name} (${option.code})` : option.name;
}

export function SearchablePicker({
  label,
  placeholder,
  options,
  value,
  onChange,
  loading = false,
  error,
}: SearchablePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.id === value);

  const results = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.name?.toLowerCase().includes(needle) ||
        option.code?.toLowerCase().includes(needle),
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => !loading && setOpen(true)}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={`${label} — ${selected ? describe(selected) : placeholder}`}
        accessibilityState={{ disabled: loading, expanded: open }}
        style={({ pressed }) => [
          styles.field,
          !!error && styles.fieldError,
          pressed && styles.pressed,
          loading && styles.fieldDisabled,
        ]}
      >
        <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
          {loading ? "Chargement…" : selected ? describe(selected) : placeholder}
        </Text>
        <ChevronDown size={18} color={Ink[300]} strokeWidth={1.5} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <SafeAreaView style={styles.sheet} edges={["top", "bottom"]}>
          <ScreenHeader
            title={label}
            right={{
              icon: <X size={20} color={Ink[900]} strokeWidth={1.5} />,
              accessibilityLabel: "Fermer",
              onPress: close,
            }}
          />

          <View style={styles.search}>
            <Input
              placeholder="Rechercher…"
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              icon={<Search size={18} color={Ink[300]} strokeWidth={1.5} />}
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const active = item.id === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.id);
                    close();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.item,
                    index > 0 && styles.itemDivided,
                    active && styles.itemActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.itemText}>
                    <Text style={[styles.itemName, active && styles.itemNameActive]}>
                      {item.name}
                    </Text>
                    {item.code ? <Text style={styles.itemCode}>{item.code}</Text> : null}
                  </View>
                  {active ? <Check size={20} color={Violet[700]} strokeWidth={2} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                title="Aucun résultat"
                body={
                  query
                    ? `Rien ne correspond à « ${query} ».`
                    : "La liste est vide pour le moment."
                }
              />
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Space.sm },
  label: { ...Type.label, color: Ink[500] },
  /* Même repos que `Input` et `Select` — voir le commentaire de `Select`. */
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
    height: 56,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Violet[100],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fieldError: { borderColor: Status.error },
  fieldDisabled: { backgroundColor: Surface.alt },
  pressed: { opacity: 0.72 },
  fieldText: { ...UIType.fieldText, color: Ink[900], flex: 1 },
  placeholder: { color: Ink[300] },
  error: { ...Type.micro, color: Status.error },

  sheet: { flex: 1, backgroundColor: Surface.default },
  search: { paddingHorizontal: GUTTER, paddingBottom: Space.md },
  list: { paddingHorizontal: GUTTER, paddingBottom: Space.huge },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.lg,
  },
  itemDivided: { borderTopWidth: 1, borderTopColor: Border.hairline },
  itemActive: {
    backgroundColor: Violet[100],
    borderTopColor: "transparent",
    marginHorizontal: -Space.md,
    paddingHorizontal: Space.md,
    borderRadius: Radius.input,
    ...continuous,
  },
  itemText: { flex: 1, gap: 2 },
  itemName: { ...UIType.fieldText, color: Ink[900] },
  itemNameActive: { color: Violet[900] },
  itemCode: { ...Type.micro, color: Ink[300] },
});
