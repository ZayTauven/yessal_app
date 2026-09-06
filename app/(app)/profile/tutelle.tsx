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
 * ── ✅ Modifier et retirer, ouverts au lot 4 ─────────────────────────────────
 *
 * L'écran ne savait que CRÉER, et une faute de frappe dans le nom d'un proche
 * était définitive. Le point d'API existait pourtant depuis toujours :
 * `TutelleViewSet` est un `ModelViewSet` complet dont le `get_queryset` est
 * borné à `tutor=request.user` — il ne manquait que le câblage.
 *
 * La feuille sert donc les deux gestes, création et correction. Le retrait est
 * une `Alert` de confirmation, pas un balayage : sur une liste de six proches
 * qu'on touche deux fois par an, un geste destructeur ne doit pas pouvoir
 * partir tout seul.
 *
 * ⚠ Retirer une tutelle N'EFFACE AUCUN Jëf. Les dons déjà faits en son nom
 * restent au registre — c'est dit dans la confirmation, parce que c'est
 * exactement ce qu'on craint en appuyant.
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
import { Heart, Pencil, Trash2, UserPlus } from "lucide-react-native";

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
  HIT,
  Ink,
  Radius,
  Shadow,
  Space,
  Status,
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
  /** `null` = création. Une tutelle = correction de celle-là. */
  const [editing, setEditing] = useState<Tutelle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

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

  const onUpdated = useCallback((saved: Tutelle) => {
    setState((previous) => ({
      ...previous,
      tutelles: previous.tutelles.map((t) => (t.id === saved.id ? saved : t)),
    }));
    setFormOpen(false);
    setEditing(null);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((tutelle: Tutelle) => {
    setEditing(tutelle);
    setFormOpen(true);
  }, []);

  /*
    La confirmation nomme la personne et dit ce qui NE disparaît pas. « Êtes-vous
    sûr ? » ne renseigne sur rien ; ce qu'on veut savoir avant d'appuyer, c'est
    si les Jëfs déjà faits pour ce proche s'en vont avec lui.
  */
  const remove = useCallback((tutelle: Tutelle) => {
    const nom = `${tutelle.first_name} ${tutelle.last_name}`.trim();
    Alert.alert(
      `Retirer ${nom} ?`,
      "Vous ne pourrez plus contribuer en son nom. Les Jëfs déjà faits pour cette personne restent à votre registre.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            setRemoving(tutelle.id);
            try {
              await ContentService.deleteTutelle(tutelle.id);
              setState((previous) => ({
                ...previous,
                tutelles: previous.tutelles.filter((t) => t.id !== tutelle.id),
              }));
            } catch {
              Alert.alert("Retrait impossible", "Le proche n'a pas pu être retiré. Réessayez.");
            } finally {
              setRemoving(null);
            }
          },
        },
      ],
    );
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
          onPress: openCreate,
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
          <TutelleEmptyState onAdd={openCreate} />
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
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => donateFor(tutelle)}
                    accessibilityRole="button"
                    accessibilityLabel={`Contribuer pour ${tutelle.first_name}`}
                    style={({ pressed }) => [styles.donate, pressed && styles.pressed]}
                  >
                    <Heart size={14} color={Violet[700]} strokeWidth={1.75} />
                    <Text style={styles.donateText}>Contribuer pour {tutelle.first_name}</Text>
                  </Pressable>

                  {/*
                    Corriger et retirer sont des gestes secondaires : ils se
                    tiennent en retrait, en icône, quand « Contribuer » garde le
                    libellé. C'est le geste qu'on vient faire ici.
                  */}
                  <Pressable
                    onPress={() => openEdit(tutelle)}
                    accessibilityRole="button"
                    accessibilityLabel={`Corriger la fiche de ${tutelle.first_name}`}
                    hitSlop={6}
                    style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
                  >
                    <Pencil size={16} color={Ink[500]} strokeWidth={1.7} />
                  </Pressable>
                  <Pressable
                    onPress={() => remove(tutelle)}
                    disabled={removing === tutelle.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${tutelle.first_name}`}
                    hitSlop={6}
                    style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
                  >
                    <Trash2
                      size={16}
                      color={removing === tutelle.id ? Ink[300] : Status.error}
                      strokeWidth={1.7}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {state.tutelles.length > 0 ? (
          <Button
            label="Ajouter un proche"
            variant="outline"
            icon={<UserPlus size={16} color={Violet[900]} strokeWidth={1.75} />}
            onPress={openCreate}
          />
        ) : null}
      </ScrollView>

      {/* La `key` remonte la feuille à chaque changement de cible : c'est elle
          qui repose les champs, sans effet de synchronisation. */}
      <TutelleSheet
        key={editing?.id ?? "nouvelle"}
        visible={formOpen}
        tutelle={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />
    </SafeAreaView>
  );
}

/**
 * La feuille sert les DEUX gestes — ajouter et corriger.
 *
 * Un second composant aurait dupliqué trois champs, une validation et un
 * appel réseau pour ne changer qu'un verbe. La différence tient dans
 * `tutelle` : absente, on crée ; présente, on corrige celle-là.
 */
function TutelleSheet({
  visible,
  tutelle,
  onClose,
  onCreated,
  onUpdated,
}: {
  visible: boolean;
  tutelle: Tutelle | null;
  onClose: () => void;
  onCreated: (created: Tutelle) => void;
  onUpdated: (saved: Tutelle) => void;
}) {
  /*
    ⚠ LES CHAMPS SONT INITIALISÉS, PAS SYNCHRONISÉS.

    Un premier jet les recopiait depuis `tutelle` dans un `useEffect`. Le React
    Compiler le refuse (`react-hooks/set-state-in-effect`) — et il a raison :
    remplir un formulaire n'est pas synchroniser deux états, c'est le monter
    avec une valeur de départ. Le parent remonte donc la feuille par sa `key`
    quand on passe d'une tutelle à une autre, et l'état repart de zéro sans
    qu'aucun effet n'ait à courir après lui.

    C'est la troisième fois que ce piège se présente sur ce dépôt ; la réponse
    est chaque fois la même — sortir le `setState` de l'effet, pas le
    contourner.
  */
  const [firstName, setFirstName] = useState(tutelle?.first_name ?? "");
  const [lastName, setLastName] = useState(tutelle?.last_name ?? "");
  const [relation, setRelation] = useState(tutelle?.relation ?? "");
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
      if (tutelle) {
        const saved = await ContentService.updateTutelle(tutelle.id, {
          first_name,
          last_name,
          relation: link,
        });
        onUpdated(saved);
      } else {
        const created = await ContentService.createTutelle({
          first_name,
          last_name,
          relation: link,
        });
        setFirstName("");
        setLastName("");
        setRelation("");
        onCreated(created);
      }
    } catch (error) {
      Alert.alert(
        tutelle ? "Correction impossible" : "Enregistrement impossible",
        error instanceof Error ? error.message : "La fiche n'a pas pu être enregistrée.",
      );
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, onCreated, onUpdated, relation, tutelle]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="Fermer" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>
          {tutelle ? "Corriger la fiche" : "Ajouter un proche"}
        </Text>

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
            label={tutelle ? "Corriger" : "Enregistrer"}
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

  actions: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  iconAction: {
    width: HIT,
    height: HIT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
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
