/**
 * app/(app)/campaign/new.tsx — lancer un Ndiguel.
 *
 * ── Qui a le droit, et pourquoi ça surprend ─────────────────────────────────
 *
 * Pas seulement les responsables. `CAMPAIGN_CREATOR_ROLES` ouvre la création à
 * `admin`, `chef_daara`, `collector` **et `member`** (`events/views.py:19`) —
 * seule la tutelle en est exclue. Un talibé peut donc lancer un appel, c'est
 * déjà vrai au tableau de bord depuis toujours, et le mobile ne savait pas le
 * faire : l'audit de parité l'a relevé comme la deuxième fonction manquante,
 * juste après l'ouverture d'une conversation.
 *
 * ── Trois pièges du contrat, tous vérifiés ──────────────────────────────────
 *
 * 1. **`deadline` est un `DateField`**, pas un `DateTimeField`. Le format est
 *    `AAAA-MM-JJ` ; un ISO complet fait un 400. La saisie se fait donc en
 *    JJ/MM/AAAA — ce qu'un membre écrit naturellement — et l'écran convertit.
 *
 * 2. **Le statut par défaut du modèle est `pending`**, pas `active`. Un
 *    Ndiguel créé sans le préciser n'apparaîtrait PAS sur l'accueil, qui ne
 *    garde que les actifs. `ContentService.createCampaign` force donc
 *    `active`, exactement comme le fait `addCampaign` côté web.
 *
 * 3. **`goal_amount` est facultatif, et son absence a un sens affiché** : la
 *    fiche montre « Objectif ouvert · chaque contribution compte » au lieu
 *    d'une barre de progression. On le dit sous le champ, sinon on laisse
 *    croire à un oubli.
 *
 * ── Ce que l'écran ne demande pas ───────────────────────────────────────────
 *
 * — **La photographie.** `campaignVisual` fournit déjà un visuel de repli
 *   authentique, et téléverser une image avant même d'avoir lancé l'appel
 *   ajoute une étape à un formulaire qu'on veut court. Elle se pose depuis le
 *   tableau de bord.
 * — **Le responsable et le Daara.** Django les déduit ou les laisse vides ;
 *   les demander ici reviendrait à faire choisir un membre dans une liste de
 *   plusieurs centaines de noms, au doigt, pour un champ facultatif.
 */
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";
import { ContentService } from "@/lib/content.service";
import { formatFCFA } from "@/lib/format";
import { GUTTER, Ink, Space, Surface, Type, Violet } from "@/theme";

/** Le plancher d'un objectif, quand il y en a un. Aligné sur le Jëf minimal. */
const MIN_GOAL = 500;

/**
 * « 07/03/2027 » → « 2027-03-07 », ou `null` si la date n'est pas écrite.
 *
 * On valide le CALENDRIER, pas seulement la forme : `new Date(2027, 1, 31)`
 * bascule au 3 mars sans se plaindre. On relit donc les trois composantes
 * après construction — sinon un 31 février partirait au serveur en 3 mars, et
 * le membre découvrirait la substitution sur la fiche.
 */
function toIsoDate(saisie: string): string | null {
  const m = saisie.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, j, mo, a] = m;
  const jour = Number(j);
  const mois = Number(mo);
  const annee = Number(a);
  const d = new Date(annee, mois - 1, jour);
  if (
    d.getFullYear() !== annee ||
    d.getMonth() !== mois - 1 ||
    d.getDate() !== jour
  ) {
    return null;
  }
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/** Aujourd'hui à minuit — la borne basse d'une échéance. */
function aujourdhui(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function NewCampaignScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  /** L'aperçu du montant, formaté à la locale — « 250000 » se lit mal. */
  const apercuObjectif = useMemo(() => {
    const chiffres = goal.replace(/\D/g, "");
    if (!chiffres) return null;
    return formatFCFA(Number(chiffres));
  }, [goal]);

  const submit = useCallback(async () => {
    const suivants: Record<string, string> = {};

    const nom = name.trim();
    if (!nom) suivants.name = "Donnez un nom à votre Ndiguel.";

    const iso = toIsoDate(deadline);
    if (!deadline.trim()) {
      suivants.deadline = "L'échéance est obligatoire.";
    } else if (!iso) {
      suivants.deadline = "Écrivez la date en JJ/MM/AAAA, par exemple 31/12/2026.";
    } else if (new Date(iso) < aujourdhui()) {
      /*
        Django accepte une date passée sans broncher. Un Ndiguel déjà échu à sa
        création s'afficherait « J−12 » et n'appellerait plus rien : on le
        refuse ici, là où on peut encore l'expliquer.
      */
      suivants.deadline = "L'échéance est déjà passée.";
    }

    const chiffres = goal.replace(/\D/g, "");
    if (chiffres && Number(chiffres) < MIN_GOAL) {
      suivants.goal = `Un objectif part de ${formatFCFA(MIN_GOAL)}. Laissez vide pour un objectif ouvert.`;
    }

    setErrors(suivants);
    if (Object.keys(suivants).length > 0) return;

    setSaving(true);
    try {
      const campaign = await ContentService.createCampaign({
        name: nom,
        deadline: iso as string,
        objective: objective.trim() || null,
        description: description.trim() || null,
        goal_amount: chiffres ? Number(chiffres) : null,
      });
      /*
        `replace` et non `push` : le formulaire n'a plus de raison d'être dans
        la pile. Le geste de retour depuis la fiche doit ramener à la liste des
        Ndiguels, pas rouvrir un formulaire déjà envoyé.
      */
      router.replace(`/campaign/${campaign.id}`);
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? (() => {
              const data = error.payload as Record<string, unknown> | undefined;
              if (typeof data?.detail === "string") return data.detail;
              const premier = Object.values(data ?? {})
                .flat()
                .find((v): v is string => typeof v === "string");
              return premier ?? "Le Ndiguel n'a pas pu être lancé.";
            })()
          : "Le Ndiguel n'est pas parti. Vérifiez votre connexion.";
      Alert.alert("Ndiguel non lancé", detail);
      setSaving(false);
    }
  }, [name, objective, description, goal, deadline, router]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel="Revenir"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/campaigns"))}
        />
        <Text style={styles.title}>Lancer un Ndiguel</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Un Ndiguel est un appel à contribution. Une fois lancé, il apparaît
          dans la liste et sur l&apos;accueil des membres de votre Daara.
        </Text>

        <Input
          label="Nom du Ndiguel"
          placeholder="Ex. Réfection de la grande salle"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />

        <Input
          label="Échéance"
          placeholder="JJ/MM/AAAA"
          hint={errors.deadline ? undefined : "Par exemple 31/12/2026."}
          value={deadline}
          onChangeText={setDeadline}
          keyboardType="numbers-and-punctuation"
          error={errors.deadline}
        />

        <Input
          label="Objectif en FCFA"
          placeholder="Facultatif"
          hint={
            errors.goal
              ? undefined
              : apercuObjectif
                ? `Objectif : ${apercuObjectif}.`
                : "Sans objectif chiffré, la fiche affiche « Objectif ouvert »."
          }
          value={goal}
          onChangeText={(next) => setGoal(next.replace(/\D/g, ""))}
          keyboardType="number-pad"
          error={errors.goal}
        />

        <Input
          label="Ce à quoi il sert"
          placeholder="Ex. Refaire la toiture avant l'hivernage"
          hint="Une phrase, affichée sous le titre."
          value={objective}
          onChangeText={setObjective}
        />

        <Input
          label="Détails"
          placeholder="Facultatif"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.multiline}
        />

        <Button
          label="Lancer le Ndiguel"
          onPress={submit}
          loading={saving}
          disabled={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: GUTTER,
    paddingVertical: Space.md,
  },
  title: { ...Type.cardTitle, color: Violet[900] },

  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: Space.xxl,
    gap: Space.lg,
  },
  intro: { ...Type.body, color: Ink[500] },
  multiline: { minHeight: 96, textAlignVertical: "top", paddingTop: Space.md },
});
