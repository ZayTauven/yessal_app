/**
 * app/(app)/bienvenue.tsx — l'accueil d'un compte créé par un tiers.
 *
 * Un compte importé par Excel ou créé par un administrateur arrive avec un mot
 * de passe que d'autres connaissent, et parfois sans Daara : l'import n'en
 * affecte un que si le fichier le désigne sans ambiguïté (décision du
 * 2026-10-29 — un compte sans Daara se corrige en un geste, un compte versé
 * dans le mauvais Daara fausse en silence les totaux et la collecte).
 *
 * Les étapes viennent de Django (`user.onboarding`, voir
 * `accounts/services/accueil.py`) et se font dans l'ordre :
 *
 *   daara        → LDD puis Daara, ici même ;
 *   fiche        → l'écran « Mes informations », qui existe déjà ;
 *   mot_de_passe → ici même, en DERNIER : c'est lui qui clôt l'accueil.
 *
 * La garde de `(app)/_layout.tsx` ramène ici tant qu'il reste une étape. Pas
 * de bouton « Passer » : l'accueil bloque, c'est son objet. La seule sortie
 * est la déconnexion.
 */
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";

import { SearchablePicker } from "@/components/auth/SearchablePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";
import { AuthService } from "@/lib/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { DaaraOption, LDDOption, OnboardingStep, User } from "@/types";
import {
  Border,
  GUTTER,
  Ink,
  Radius,
  Space,
  Status,
  Surface,
  Type,
  Violet,
  continuous,
} from "@/theme";

/** Le plancher de Django (`validate_password`). */
const MIN_LONGUEUR = 8;

const TITRES: Record<OnboardingStep, string> = {
  daara: "Votre Daara",
  fiche: "Votre fiche",
  mot_de_passe: "Votre mot de passe",
};

/** `CHAMPS_FICHE` côté Django, avec leurs libellés. */
const CHAMPS_FICHE: { cle: keyof User; label: string }[] = [
  { cle: "birth_date", label: "Date de naissance" },
  { cle: "gender", label: "Genre" },
  { cle: "residence_country", label: "Pays de résidence" },
  { cle: "city", label: "Ville" },
];

/** Le message d'un refus de Django, sous ses trois formes. */
function messageDe(erreur: unknown, repli: string): string {
  if (!(erreur instanceof ApiError)) return repli;
  const p = erreur.payload as Record<string, unknown> | undefined;
  const brut = p?.error ?? p?.detail ?? (Array.isArray(p?.daara_id) ? p?.daara_id[0] : null);
  return typeof brut === "string" ? brut : repli;
}

export default function BienvenueScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const etapes = user?.onboarding ?? [];
  const courante = etapes[0];

  /* Le total se fige à l'arrivée : sans cela, « étape 1 sur 3 » deviendrait
     « étape 1 sur 2 » après la première, et le membre ne verrait jamais avancer
     le compteur. */
  const [initial] = useState(etapes.length);
  const total = Math.max(initial, etapes.length);

  if (!user) return null;
  if (!courante) return <Redirect href="/home" />;

  const numero = total - etapes.length + 1;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.eyebrow}>
            Étape {numero} sur {total}
          </Text>
          <Text style={styles.title}>
            Bienvenue{user.first_name ? `, ${user.first_name}` : ""}
          </Text>
          <Text style={styles.lead}>
            Votre compte a été créé pour vous. Quelques informations avant de
            commencer : elles ne vous seront demandées qu’une fois.
          </Text>
        </View>

        <Etapes etapes={etapes} total={total} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{TITRES[courante]}</Text>
          {courante === "daara" && <EtapeDaara />}
          {courante === "fiche" && (
            <EtapeFiche user={user} onOpen={() => router.push("/profile/informations")} />
          )}
          {courante === "mot_de_passe" && <EtapeMotDePasse />}
        </View>

        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Le fil des étapes : faites, en cours, à venir. */
function Etapes({ etapes, total }: { etapes: OnboardingStep[]; total: number }) {
  /* Les étapes de CE compte seulement : un compte importé avec son Daara n'a
     jamais eu l'étape « daara », inutile de la cocher. */
  const faites = total - etapes.length;
  return (
    <View style={styles.steps}>
      {Array.from({ length: faites }).map((_, i) => (
        <View key={`fait-${i}`} style={[styles.stepDot, styles.stepDone]}>
          <Check size={12} color={Surface.default} strokeWidth={2.5} />
        </View>
      ))}
      {etapes.map((e, i) => (
        <View
          key={e}
          style={[styles.stepDot, i === 0 ? styles.stepCurrent : styles.stepTodo]}
        />
      ))}
    </View>
  );
}

function EtapeDaara() {
  const setUser = useAuthStore((s) => s.setUser);

  const [ldds, setLdds] = useState<LDDOption[]>([]);
  const [ldd, setLdd] = useState<number | null>(null);
  const [daaras, setDaaras] = useState<DaaraOption[]>([]);
  const [daara, setDaara] = useState<number | null>(null);
  const [chargement, setChargement] = useState({ ldd: true, daara: false });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    AuthService.getLDDs()
      .then(setLdds)
      .catch(() => setErreur("Impossible de charger les LDD."))
      .finally(() => setChargement((c) => ({ ...c, ldd: false })));
  }, []);

  const choisirLdd = useCallback((id: number) => {
    setLdd(id);
    setDaara(null);
    setDaaras([]);
    setChargement((c) => ({ ...c, daara: true }));
    AuthService.getDaaras(id)
      .then(setDaaras)
      .catch(() => setErreur("Impossible de charger les Daaras."))
      .finally(() => setChargement((c) => ({ ...c, daara: false })));
  }, []);

  const valider = useCallback(async () => {
    if (!daara) return;
    setEnvoi(true);
    setErreur(null);
    try {
      setUser(await AuthService.chooseDaara(daara));
    } catch (e) {
      setErreur(messageDe(e, "Le Daara n’a pas pu être enregistré."));
      setEnvoi(false);
    }
  }, [daara, setUser]);

  return (
    <View style={styles.stepBody}>
      <Text style={styles.text}>
        Choisissez la LDD puis le Daara auxquels vous appartenez. Le
        coordinateur du Daara en sera prévenu. Ce choix ne pourra ensuite être
        modifié que par un administrateur.
      </Text>
      <SearchablePicker
        label="1. Ma LDD"
        placeholder="Sélectionnez votre LDD"
        options={ldds}
        value={ldd ?? undefined}
        onChange={choisirLdd}
        loading={chargement.ldd}
      />
      {ldd !== null && (
        <SearchablePicker
          label="2. Mon Daara"
          placeholder="Rechercher mon Daara…"
          options={daaras}
          value={daara ?? undefined}
          onChange={setDaara}
          loading={chargement.daara}
          error={
            !chargement.daara && daaras.length === 0
              ? "Aucun Daara pour cette LDD."
              : undefined
          }
        />
      )}
      {erreur && <Text style={styles.error}>{erreur}</Text>}
      <Button
        label="Rejoindre ce Daara"
        onPress={valider}
        loading={envoi}
        disabled={!daara || envoi}
      />
    </View>
  );
}

function EtapeFiche({ user, onOpen }: { user: User; onOpen: () => void }) {
  const manquants = CHAMPS_FICHE.filter(({ cle }) => !user[cle]);
  return (
    <View style={styles.stepBody}>
      <Text style={styles.text}>
        Il reste à renseigner :{" "}
        {manquants.map((m) => m.label.toLowerCase()).join(", ")}.
      </Text>
      <Button label="Compléter ma fiche" onPress={onOpen} />
    </View>
  );
}

function EtapeMotDePasse() {
  const setUser = useAuthStore((s) => s.setUser);
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const valider = useCallback(async () => {
    const suivantes: Record<string, string> = {};
    if (!actuel) suivantes.actuel = "Saisissez le mot de passe qui vous a été communiqué.";
    if (nouveau.length < MIN_LONGUEUR) suivantes.nouveau = `Au moins ${MIN_LONGUEUR} caractères.`;
    else if (nouveau === actuel) suivantes.nouveau = "Choisissez un mot de passe différent.";
    if (nouveau !== confirmation) suivantes.confirmation = "Les deux saisies diffèrent.";
    setErreurs(suivantes);
    if (Object.keys(suivantes).length > 0) return;

    setEnvoi(true);
    try {
      await AuthService.changePasswordAndStay(actuel, nouveau);
      // Le drapeau s'est éteint côté serveur : la relecture clôt l'accueil.
      setUser(await AuthService.getMe());
    } catch (e) {
      const message = messageDe(e, "Le mot de passe n’a pas pu être changé.");
      setErreurs(message.toLowerCase().includes("actuel") ? { actuel: message } : { nouveau: message });
      setEnvoi(false);
    }
  }, [actuel, nouveau, confirmation, setUser]);

  return (
    <View style={styles.stepBody}>
      <Text style={styles.text}>
        Le mot de passe avec lequel vous venez de vous connecter est connu
        d’autres personnes. Choisissez le vôtre.
      </Text>
      <Input
        label="Mot de passe communiqué"
        value={actuel}
        onChangeText={setActuel}
        isPassword
        autoCapitalize="none"
        autoComplete="current-password"
        error={erreurs.actuel}
      />
      <Input
        label="Nouveau mot de passe"
        value={nouveau}
        onChangeText={setNouveau}
        isPassword
        autoCapitalize="none"
        autoComplete="new-password"
        hint={erreurs.nouveau ? undefined : `${MIN_LONGUEUR} caractères au minimum.`}
        error={erreurs.nouveau}
      />
      <Input
        label="Confirmez le nouveau"
        value={confirmation}
        onChangeText={setConfirmation}
        isPassword
        autoCapitalize="none"
        autoComplete="new-password"
        error={erreurs.confirmation}
      />
      <Button label="Terminer" onPress={valider} loading={envoi} disabled={envoi} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.alt },
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.xxl,
    paddingBottom: Space.xxl,
    gap: Space.xl,
  },
  head: { gap: Space.sm },
  eyebrow: { ...Type.label, color: Violet[700] },
  title: { ...Type.screenTitle, color: Ink[900] },
  lead: { ...Type.body, color: Ink[500] },
  steps: { flexDirection: "row", gap: Space.sm, alignItems: "center" },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: Radius.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDone: { backgroundColor: Violet[700] },
  stepCurrent: { borderWidth: 2, borderColor: Violet[700], backgroundColor: Surface.default },
  stepTodo: { borderWidth: 1, borderColor: Border.strong, backgroundColor: Surface.default },
  card: {
    ...continuous,
    backgroundColor: Surface.default,
    borderRadius: Radius.card,
    padding: Space.xl,
    gap: Space.lg,
  },
  cardTitle: { ...Type.cardTitle, color: Ink[900] },
  stepBody: { gap: Space.lg },
  text: { ...Type.body, color: Ink[500] },
  error: { ...Type.label, color: Status.error },
});
