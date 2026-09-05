/**
 * app/(app)/profile/tutelle.tsx — les tutelles, passées au système (phase F).
 *
 * Écran hérité (§5.2). Trois corrections en chemin.
 *
 * ── 🔴 Le bouton « Contribuer pour X » menait à une route inexistante ───────
 *
 *     router.push(`/(app)/donate?beneficiary=${member.id}` as any)
 *
 * `(app)` est un **groupe** : il ne fait pas partie de l'URL. La route réelle
 * est `/donate`. Le `as any` — posé pour faire taire `typedRoutes`, qui refusait
 * précisément cette chaîne — a masqué l'erreur pendant tout ce temps. C'est le
 * seul bouton de l'écran qui fasse quelque chose, et il ne le faisait pas.
 *
 * Écrit maintenant sous la forme objet, comme partout ailleurs :
 * `{ pathname: "/donate", params: { beneficiary } }` — vérifiée par
 * `typedRoutes`, donc impossible à casser en silence.
 *
 * ── Huit couleurs hors palette ──────────────────────────────────────────────
 *
 * `RELATION_COLORS` attribuait une couleur par lien de parenté — indigo pour le
 * père, rose pour la mère, ambre pour la fille… — et, à défaut, tirait dans une
 * palette de six teintes par hachage du mot. Aucune de ces quatorze couleurs
 * n'appartient au produit. Elles disparaissent au profit d'`Avatar` et de
 * `TutelleCard`, qui existaient depuis la phase B **sans aucun appelant** hors
 * de la galerie : cet écran est leur foyer naturel.
 *
 * ── Le formulaire dépliant ──────────────────────────────────────────────────
 *
 * Il restait sous la liste, derrière un bouton qui basculait entre « Ajouter un
 * membre » et « Fermer le formulaire ». Sur une liste de six proches, il fallait
 * dérouler tout l'écran pour le trouver. Il passe en feuille modale — même
 * mécanique que `Select`.
 *
 * ── Ce que l'écran ne peut pas faire ────────────────────────────────────────
 *
 * ⚠ **Ni modifier ni supprimer une tutelle.** `ContentService` n'expose que
 * `getTutelles` et `createTutelle`. Une faute de frappe dans un nom est donc
 * définitive côté mobile. Le point d'API existe peut-être ; il n'est pas câblé,
 * et ce lot ne l'ouvre pas — porté au registre de dette.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, UserPlus } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonTutelleCard } from "@/components/ui/Skeleton";
import { TutelleCard, TutelleEmptyState } from "@/components/profile/TutelleCard";
import { ContentService } from "@/lib/content.service";
import type { Tutelle } from "@/types/content.types";
import {
  GUTTER,
  Ink,
  Radius,
  Shadow,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

interface State {
  status: "loading" | "ready" | "failed";
  tutelles: Tutelle[];
}

async function fetchTutelles(): Promise<State> {
  try {
    return { status: "ready", tutelles: await ContentService.getTutelles() };
  } catch {
    return { status: "failed", tutelles: [] };
  }
}

export default function TutelleScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", tutelles: [] });
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTutelles().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchTutelles().then(setState);
  }, []);

  const onCreated = useCallback((created: Tutelle) => {
    setState((previous) => ({ ...previous, tutelles: [created, ...previous.tutelles] }));
    setFormOpen(false);
  }, []);

  const donateFor = useCallback(
    (tutelle: Tutelle) => {
      router.push({
        pathname: "/donate",
        params: { beneficiary: String(tutelle.id) },
      });
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title="Mes tutelles"
        onBack={() => router.back()}
        right={{
          icon: <UserPlus size={20} color={Ink[900]} strokeWidth={1.5} />,
          accessibilityLabel: "Ajouter une tutelle",
          onPress: () => setFormOpen(true),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Porter un proche, c&apos;est contribuer aux Ndiguels en son nom. Les
          personnes enregistrées ici apparaissent au moment du Jëf.
        </Text>

        {state.status === "loading" ? (
          <View style={styles.list}>
            <SkeletonTutelleCard />
            <SkeletonTutelleCard />
          </View>
        ) : null}

        {state.status === "failed" ? (
          <ErrorState body="Vos tutelles n'ont pas pu être chargées." onRetry={reload} />
        ) : null}

        {state.status === "ready" && state.tutelles.length === 0 ? (
          <TutelleEmptyState onAdd={() => setFormOpen(true)} />
        ) : null}

        {state.tutelles.length > 0 ? (
          <View style={styles.list}>
            {state.tutelles.map((tutelle) => (
              <View key={tutelle.id} style={styles.entry}>
                <TutelleCard
                  name={`${tutelle.first_name} ${tutelle.last_name}`.trim()}
                  relation={tutelle.relation}
                  avatarUri={tutelle.avatar_url}
                />
                <Pressable
                  onPress={() => donateFor(tutelle)}
                  accessibilityRole="button"
                  accessibilityLabel={`Contribuer pour ${tutelle.first_name}`}
                  style={({ pressed }) => [styles.donate, pressed && styles.pressed]}
                >
                  <Heart size={14} color={Violet[700]} strokeWidth={1.75} />
                  <Text style={styles.donateText}>Contribuer pour {tutelle.first_name}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {state.tutelles.length > 0 ? (
          <Button
            label="Ajouter un proche"
            variant="outline"
            icon={<UserPlus size={16} color={Violet[900]} strokeWidth={1.75} />}
            onPress={() => setFormOpen(true)}
          />
        ) : null}
      </ScrollView>

      <AddTutelleSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={onCreated}
      />
    </SafeAreaView>
  );
}

function AddTutelleSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (created: Tutelle) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relation, setRelation] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    const first_name = firstName.trim();
    const last_name = lastName.trim();
    const link = relation.trim();

    if (!first_name || !last_name || !link) {
      Alert.alert("Champs requis", "Le prénom, le nom et le lien de parenté sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const created = await ContentService.createTutelle({
        first_name,
        last_name,
        relation: link,
      });
      setFirstName("");
      setLastName("");
      setRelation("");
      onCreated(created);
    } catch (error) {
      Alert.alert(
        "Enregistrement impossible",
        error instanceof Error ? error.message : "Le proche n'a pas pu être ajouté.",
      );
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, onCreated, relation]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="Fermer" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>Ajouter un proche</Text>

        <Input
          label="Prénom"
          placeholder="Souleymane"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <Input
          label="Nom"
          placeholder="Diop"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        <Input
          label="Lien de parenté"
          placeholder="Mère, fils, petit-neveu maternel…"
          value={relation}
          onChangeText={setRelation}
          autoCapitalize="sentences"
        />

        <View style={styles.sheetActions}>
          <Button label="Annuler" variant="secondary" onPress={onClose} style={styles.action} />
          <Button
            label="Enregistrer"
            onPress={submit}
            loading={saving}
            style={styles.actionWide}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: Space.huge,
    gap: Space.lg,
  },
  lead: { ...Type.body, color: Ink[500] },
  list: { gap: Space.md },
  entry: { gap: Space.xs },

  donate: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    alignSelf: "flex-start",
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.chip,
    backgroundColor: Violet[100],
  },
  donateText: { ...UIType.chipLabel, color: Violet[900] },
  pressed: { opacity: 0.72 },

  backdrop: { flex: 1, backgroundColor: "rgba(25,11,61,0.32)" },
  sheet: {
    backgroundColor: Surface.default,
    borderTopLeftRadius: Radius.card + 4,
    borderTopRightRadius: Radius.card + 4,
    ...continuous,
    paddingHorizontal: GUTTER,
    paddingTop: Space.md,
    paddingBottom: Space.xxxl,
    gap: Space.md,
    boxShadow: Shadow.sheet,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: Radius.chip,
    backgroundColor: Ink[100],
  },
  sheetTitle: { ...Type.cardTitle, color: Ink[900] },
  sheetActions: { flexDirection: "row", gap: Space.md, marginTop: Space.sm },
  action: { flex: 1 },
  actionWide: { flex: 1.4 },
});
