/**
 * app/(app)/profile/informations.tsx — l'état civil du membre.
 *
 * ── L'écran que la phase E avait supprimé sans le remplacer ────────────────
 *
 * La scission du §3.4 a réparti l'ancien `profile.tsx` de 738 lignes entre le
 * Profil et les Paramètres, et a laissé le formulaire d'état civil **sans
 * domicile** : onze champs que `ProfileUpdatePayload` accepte toujours et
 * qu'aucun écran mobile n'écrivait plus. Le motif était honnête — « la planche
 * ne les dessine nulle part, deviner un écran pour eux aurait été inventer du
 * produit » — mais il manquait une information : **c'est une règle de produit
 * Yessal**, déjà tenue par `front-web`, qu'un membre renseigne son profil.
 *
 * Le lot suivant a d'ailleurs retiré le bandeau « Profil incomplet » parce
 * qu'« il réclamait des champs que plus aucun écran ne demande ». On a donc
 * ôté le rappel au lieu de rétablir la destination. Les deux reviennent
 * ensemble.
 *
 * ── Ce que cet écran écrit, et ce qu'il laisse ─────────────────────────────
 *
 * **Les champs de `ProfileUpdatePayload`**, et non les six de la règle
 * de complétude. Un premier jet les avait écartés — « demander une donnée dont
 * le produit ne fait rien » — mais le commanditaire a tranché : la fiche membre
 * est le registre du Daara, et le formulaire web les demande déjà tous. Un
 * membre qui remplit son profil sur le téléphone ne doit pas devoir ouvrir le
 * web pour finir.
 *
 * ⚠ Reste dehors : `title`. Ce n'est pas une saisie libre — c'est une DEMANDE,
 * soumise au responsable du Daara, et limitée à un seul changement dans une vie
 * (`accounts/views.py:524`). Elle a sa feuille dans les Paramètres.
 *
 * Ce qui n'entre pas dans la règle de complétude reste donc **facultatif** et
 * porte la mention : on demande sans exiger.
 *
 * La photographie et la pièce d'identité ne sont pas ici non plus — elles ont
 * leurs écrans (`profile/settings`, `profile/documents`), vers lesquels la
 * liste de contrôle renvoie directement.
 */
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, ChevronRight } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Select, type SelectOption } from "@/components/ui/Select";
import { CountrySheet } from "@/components/auth/CountrySheet";
import { DialPrefix } from "@/components/auth/DialPrefix";
import {
  DEFAULT_COUNTRY,
  DIAL_COUNTRIES,
  subscriberBounds,
  type DialCountry,
} from "@/lib/dial-codes";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useAuthStore } from "@/store/auth.store";
import type { CompletionItem } from "@/lib/profile-completion";
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

const GENDERS: SelectOption[] = [
  { value: "male", label: "Homme" },
  { value: "female", label: "Femme" },
  { value: "other", label: "Autre" },
];

/**
 * ⚠ QUATRE valeurs, pas deux. `User.MaritalStatus` (`accounts/models.py:116`)
 * déclare `single`, `married`, `divorced` et `widowed` — mais le formulaire web
 * n'en propose que les deux premières. Une personne veuve ou divorcée ne
 * pouvait donc pas se décrire, ou devait se dire célibataire.
 *
 * Le modèle fait foi. **C'est le web qu'il faut compléter**, pas ce jeu qu'il
 * faut réduire — porté au registre.
 */
const MARITAL_STATUS: SelectOption[] = [
  { value: "single", label: "Célibataire" },
  { value: "married", label: "Marié(e)" },
  { value: "divorced", label: "Divorcé(e)" },
  { value: "widowed", label: "Veuf(ve)" },
];

/** `User.BloodType` — les huit groupes, dans l'ordre du modèle. */
const BLOOD_TYPES: SelectOption[] = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
].map((value) => ({ value, label: value }));

/**
 * La date part en `YYYY-MM-DD` — ce que `DateField` attend. Le membre la saisit
 * en `JJ/MM/AAAA`, la seule forme qu'on écrive et qu'on dicte au Sénégal.
 *
 * Pas de sélecteur de calendrier : atteindre 1974 depuis 2026 y demande une
 * cinquantaine de gestes. Un champ de huit chiffres se remplit en huit frappes.
 */
function toIso(saisie: string): string | null {
  const m = saisie.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, jour, mois, annee] = m;
  const date = new Date(`${annee}-${mois}-${jour}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  /* `new Date("2026-02-31")` ne lève pas, il déborde sur mars : on vérifie que
     la date rendue est bien celle qu'on a demandée. */
  if (date.getUTCDate() !== Number(jour) || date.getUTCMonth() + 1 !== Number(mois)) {
    return null;
  }
  if (date > new Date()) return null;
  return `${annee}-${mois}-${jour}`;
}

function fromIso(iso?: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * Sépare un numéro E.164 stocké en (pays, chiffres d'abonné).
 *
 * On essaie les indicatifs LES PLUS LONGS d'abord : « +1 » est un préfixe de
 * « +212 », et un numéro marocain se lirait sinon comme américain.
 *
 * Le Canada et les États-Unis partagent « +1 » : on retient le premier de la
 * table, et le membre corrige d'un geste si besoin. Aucune donnée ne permet de
 * trancher entre les deux.
 */
function splitPhone(e164?: string | null): { country: DialCountry; digits: string } {
  const compact = (e164 ?? "").replace(/[^0-9+]/g, "");
  if (compact.startsWith("+")) {
    const candidats = [...DIAL_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const pays of candidats) {
      if (compact.startsWith(pays.prefix)) {
        return { country: pays, digits: compact.slice(pays.prefix.length) };
      }
    }
  }
  return { country: DEFAULT_COUNTRY, digits: "" };
}

/** Groupe les chiffres en JJ/MM/AAAA pendant la frappe. */
function formatDateInput(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export default function InformationsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const completion = useProfileCompletion();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [birthDate, setBirthDate] = useState(fromIso(user?.birth_date));
  const [gender, setGender] = useState(user?.gender ?? "");
  const [country, setCountry] = useState(user?.residence_country ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  /* `state` est le nom du champ serveur ; « région » est celui qu'on lit. */
  const [stateField, setStateField] = useState(user?.state ?? "");
  const [zipCode, setZipCode] = useState(user?.zip_code ?? "");
  const [maritalStatus, setMaritalStatus] = useState(user?.marital_status ?? "");
  const [bloodType, setBloodType] = useState(user?.blood_type ?? "");

  /**
   * Le téléphone est aussi l'IDENTIFIANT DE CONNEXION : il se saisit donc ici
   * comme à l'inscription, indicatif choisi et non deviné. Un membre qui
   * corrigerait son numéro en saisie libre risquerait de se le voir prêter
   * `+221` et de ne plus pouvoir se connecter.
   *
   * Le numéro stocké est en E.164 : on le décompose pour retrouver le pays.
   */
  const [phoneCountry, setPhoneCountry] = useState<DialCountry>(
    () => splitPhone(user?.phone).country,
  );
  const [phoneDigits, setPhoneDigits] = useState(() => splitPhone(user?.phone).digits);
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState("");

  const restants = useMemo(
    () => completion?.missing ?? [],
    [completion],
  );

  const submit = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Champs requis", "Le prénom et le nom sont obligatoires.");
      return;
    }

    /* La date est facultative, mais si elle est saisie elle doit être vraie. */
    let iso: string | null = null;
    if (birthDate.trim()) {
      iso = toIso(birthDate);
      if (!iso) {
        setDateError("Date invalide. Attendu : JJ/MM/AAAA, dans le passé.");
        return;
      }
    }
    setDateError("");

    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: iso,
        gender: gender || null,
        residence_country: country.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        state: stateField.trim() || null,
        zip_code: zipCode.trim() || null,
        marital_status: maritalStatus || null,
        blood_type: bloodType || null,
        phone: phoneDigits ? `${phoneCountry.prefix}${phoneDigits}` : null,
      });
      Alert.alert("Profil enregistré", "Vos informations ont été mises à jour.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        "Enregistrement impossible",
        error instanceof Error ? error.message : "Réessayez dans un instant.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    address,
    birthDate,
    bloodType,
    city,
    country,
    firstName,
    gender,
    lastName,
    maritalStatus,
    phoneCountry,
    phoneDigits,
    router,
    stateField,
    updateProfile,
    zipCode,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader title="Mes informations" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Ces informations permettent à votre Daara de tenir son registre et de
          valider votre inscription.
        </Text>

        {restants.length > 0 ? (
          <Checklist items={completion?.items ?? []} onGo={(route) => router.push(route)} />
        ) : null}

        <Card style={styles.form}>
          <View style={styles.row}>
            <Input
              label="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              containerStyle={styles.half}
            />
            <Input
              label="Nom"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              containerStyle={styles.half}
            />
          </View>

          <Input
            label="Date de naissance"
            placeholder="JJ/MM/AAAA"
            keyboardType="number-pad"
            value={birthDate}
            onChangeText={(raw) => {
              setBirthDate(formatDateInput(raw));
              setDateError("");
            }}
            maxLength={10}
            error={dateError}
            hint={dateError ? undefined : "Par exemple 07/03/1988."}
          />

          <Select
            label="Genre"
            value={gender}
            options={GENDERS}
            onSelect={setGender}
            placeholder="Choisir"
          />

          <Input
            label="Pays de résidence"
            placeholder="Sénégal, France, Italie…"
            value={country}
            onChangeText={setCountry}
            autoCapitalize="words"
          />
          <Input
            label="Ville"
            placeholder="Touba, Dakar, Marseille…"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
          <Input
            label="Adresse"
            placeholder="Ex. Sacré-Cœur 3, villa 12"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="sentences"
          />

          <Input
            label="Téléphone"
            placeholder={phoneCountry.iso === "SN" ? "77 000 00 00" : "Votre numéro"}
            keyboardType="phone-pad"
            value={phoneDigits}
            onChangeText={(raw) =>
              setPhoneDigits(
                raw.replace(/[^0-9]/g, "").slice(0, subscriberBounds(phoneCountry).max),
              )
            }
            maxLength={subscriberBounds(phoneCountry).max}
            hint="C'est aussi votre identifiant de connexion."
            prefixSlot={
              <DialPrefix
                country={phoneCountry}
                onPress={() => setPhoneSheetOpen(true)}
              />
            }
          />

          <View style={styles.row}>
            <Input
              label="Région"
              placeholder="Ex. Diourbel"
              value={stateField}
              onChangeText={setStateField}
              autoCapitalize="words"
              containerStyle={styles.half}
            />
            <Input
              label="Code postal"
              placeholder="Ex. 21000"
              keyboardType="number-pad"
              value={zipCode}
              onChangeText={setZipCode}
              maxLength={12}
              containerStyle={styles.half}
            />
          </View>
        </Card>

        {/* Facultatif, et dit comme tel : rien ici n'entre dans la règle de
            complétude, et un membre doit pouvoir s'arrêter avant. */}
        <Text style={styles.sectionTitle}>Informations complémentaires</Text>
        <Card style={styles.form}>
          <Select
            label="Statut matrimonial"
            value={maritalStatus}
            options={MARITAL_STATUS}
            onSelect={setMaritalStatus}
            placeholder="Non renseigné"
          />
          <Select
            label="Groupe sanguin"
            value={bloodType}
            options={BLOOD_TYPES}
            onSelect={setBloodType}
            placeholder="Non renseigné"
          />
        </Card>

        <Button label="Enregistrer" onPress={submit} loading={saving} />
      </ScrollView>

      <CountrySheet
        visible={phoneSheetOpen}
        selected={phoneCountry}
        onSelect={(next) => {
          setPhoneCountry(next);
          setPhoneDigits((d) => d.slice(0, subscriberBounds(next).max));
        }}
        onClose={() => setPhoneSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

/**
 * La liste de contrôle — la même que celle du web, et le seul endroit qui
 * mène à la photographie et à la pièce d'identité, qui ne se saisissent pas
 * ici.
 */
function Checklist({
  items,
  onGo,
}: {
  items: CompletionItem[];
  onGo: (route: CompletionItem["route"]) => void;
}) {
  return (
    <View style={styles.checklist}>
      {/* « Ce qui reste à renseigner » était faux : la liste montre les SEPT
          critères, cochés compris — c'est ce qui permet de voir le chemin
          parcouru autant que ce qui manque. Le décompte le dit maintenant. */}
      <Text style={styles.checklistTitle}>
        Votre profil · {items.filter((i) => i.done).length} sur {items.length}
      </Text>
      {items.map((item, index) => {
        const ailleurs = item.route !== "/profile/informations";
        return (
          <Pressable
            key={item.id}
            disabled={item.done || !ailleurs}
            onPress={() => onGo(item.route)}
            accessibilityRole={ailleurs && !item.done ? "button" : "text"}
            accessibilityState={{ checked: item.done }}
            style={({ pressed }) => [
              styles.check,
              index > 0 && styles.checkDivided,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.checkMark, item.done && styles.checkMarkDone]}>
              {item.done ? (
                <Check size={12} color={Surface.default} strokeWidth={3} />
              ) : null}
            </View>
            <Text style={[styles.checkLabel, item.done && styles.checkLabelDone]}>
              {item.label}
            </Text>
            {/* Le chevron ne s'affiche que là où il mène ailleurs. */}
            {ailleurs && !item.done ? (
              <ChevronRight size={16} color={Violet[700]} strokeWidth={1.75} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
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

  checklist: {
    backgroundColor: Surface.alt,
    borderRadius: Radius.card,
    ...continuous,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
  },
  checklistTitle: {
    ...UIType.chipLabel,
    color: Ink[500],
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  check: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.md,
  },
  checkDivided: { borderTopWidth: 1, borderTopColor: Border.hairline },
  pressed: { opacity: 0.72 },
  checkMark: {
    width: 20,
    height: 20,
    borderRadius: Radius.chip,
    borderWidth: 1.5,
    borderColor: Ink[100],
    alignItems: "center",
    justifyContent: "center",
  },
  checkMarkDone: { backgroundColor: Status.success, borderColor: Status.success },
  checkLabel: { ...Type.body, color: Ink[900], flex: 1 },
  checkLabelDone: { color: Ink[300] },

  sectionTitle: { ...UIType.chipLabel, color: Ink[500], marginTop: Space.sm },
  form: { gap: 0 },
  row: { flexDirection: "row", gap: Space.md },
  half: { flex: 1 },
});
