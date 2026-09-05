/**
 * CountrySheet — le choix de l'indicatif téléphonique.
 *
 * Feuille modale cherchable, sur la mécanique de `Select` et de
 * `SearchablePicker` : voile violet-950 à 32 %, coins hauts au rayon de carte,
 * poignée de 36. La recherche accepte un nom, un code ISO ou un indicatif —
 * « France », « fr », « 33 », « +33 ».
 *
 * ── Pourquoi une feuille et pas une liste déroulante ────────────────────────
 *
 * Cent trente entrées. Une `Alert.alert` en plafonne trois sur Android — le
 * défaut qui rendait deux pièces d'identité sur quatre inaccessibles, corrigé
 * en phase F sur `Select`. Une feuille cherchable est le seul geste tenable.
 *
 * Le pays retenu porte une coche ; la liste s'ouvre dessus.
 */
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Search, X } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { searchCountries, type DialCountry } from "@/lib/dial-codes";
import {
  Border,
  GUTTER,
  Ink,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

interface CountrySheetProps {
  visible: boolean;
  selected: DialCountry;
  onSelect: (country: DialCountry) => void;
  onClose: () => void;
}

export function CountrySheet({
  visible,
  selected,
  onSelect,
  onClose,
}: CountrySheetProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCountries(query), [query]);

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <SafeAreaView style={styles.sheet} edges={["top", "bottom"]}>
        <ScreenHeader
          title="Indicatif du pays"
          right={{
            icon: <X size={20} color={Ink[900]} strokeWidth={1.5} />,
            accessibilityLabel: "Fermer",
            onPress: close,
          }}
        />

        <View style={styles.search}>
          <Input
            placeholder="Pays ou indicatif…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            icon={<Search size={18} color={Ink[300]} strokeWidth={1.5} />}
          />
        </View>

        <FlatList
          data={results}
          /* Le Canada et les États-Unis partagent l'indicatif 1 : la clé est
             l'ISO, jamais l'indicatif. */
          keyExtractor={(item) => item.iso}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const active = item.iso === selected.iso;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  close();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.prefix}`}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.divided,
                  active && styles.rowActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.dial}>{item.prefix}</Text>
                {active ? <Check size={18} color={Violet[700]} strokeWidth={2} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="Aucun pays"
              body={`Rien ne correspond à « ${query.trim()} ».`}
            />
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Surface.default },
  search: { paddingHorizontal: GUTTER, paddingBottom: Space.md },
  list: { paddingHorizontal: GUTTER, paddingBottom: Space.huge },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.md,
  },
  divided: { borderTopWidth: 1, borderTopColor: Border.hairline },
  rowActive: {
    backgroundColor: Violet[100],
    borderTopColor: "transparent",
    marginHorizontal: -Space.md,
    paddingHorizontal: Space.md,
    borderRadius: Radius.input,
    ...continuous,
  },
  pressed: { opacity: 0.72 },
  /* 22 px : un drapeau emoji rendu à la taille du texte paraît rabougri. */
  flag: { fontSize: 22, lineHeight: 26 },
  name: { ...UIType.fieldText, color: Ink[900], flex: 1 },
  nameActive: { color: Violet[900] },
  dial: { ...Type.label, color: Ink[500], fontVariant: ["tabular-nums"] },
});
