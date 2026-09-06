/**
 * app/(app)/profile/password.tsx — changer son mot de passe.
 *
 * L'écran manquant. `POST /auth/change-password/` existait côté Django et
 * n'était appelé par aucun chemin mobile : la ligne « Changer le mot de passe »
 * des Paramètres renvoyait vers `/forgot`, c'est-à-dire vers un parcours par
 * COURRIEL. Conséquence, relevée par l'audit de parité : un membre inscrit par
 * téléphone seul — l'inscription l'autorise — ne pouvait pas changer son mot de
 * passe. Or ce sont précisément les comptes créés par un tiers, avec un mot de
 * passe attribué (parfois commun à toute une promotion dans le cas de l'import
 * Excel), qui en ont le plus besoin.
 *
 * ── L'ancien mot de passe est exigé, et c'est le serveur qui a raison ───────
 *
 * `ChangePasswordView` le vérifie (`accounts/views.py:152`). Sans lui, un jeton
 * volé suffirait à verrouiller un compte de façon définitive. On le demande
 * donc ici aussi, plutôt que de laisser le refus arriver en 400.
 *
 * ── Ce qui se passe APRÈS, et qu'il faut annoncer avant ─────────────────────
 *
 * Le succès appelle `User.revoke_sessions()` : **toutes** les sessions
 * tombent, y compris celle-ci. Ce n'est pas un effet de bord, c'est la
 * fonction — un mot de passe qu'on change parce qu'on le croit connu doit
 * déconnecter l'autre. Mais le découvrir en se retrouvant à l'écran de
 * connexion ressemble à une panne. La ligne des Paramètres le disait déjà
 * (« Vos autres appareils seront déconnectés ») ; cet écran le redit, et la
 * confirmation le rappelle une dernière fois avant de renvoyer à la connexion.
 */
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ApiError } from "@/lib/api";
import { AuthService } from "@/lib/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { GUTTER, Ink, Space, Surface, Type } from "@/theme";

/** Le plancher de Django (`validate_password`). Le dire évite un aller-retour. */
const MIN_LONGUEUR = 8;

export default function PasswordScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  /*
    La confirmation est contrôlée À LA SAISIE et non à l'envoi : une faute de
    frappe sur un champ masqué ne se voit pas, et l'apprendre après coup oblige
    à ressaisir les trois champs.
  */
  const desaccord = useMemo(
    () => confirmation.length > 0 && nouveau !== confirmation,
    [nouveau, confirmation],
  );

  const submit = useCallback(async () => {
    const suivantes: Record<string, string> = {};
    if (!actuel) suivantes.actuel = "Saisissez votre mot de passe actuel.";
    if (!nouveau) {
      suivantes.nouveau = "Choisissez un nouveau mot de passe.";
    } else if (nouveau.length < MIN_LONGUEUR) {
      suivantes.nouveau = `Au moins ${MIN_LONGUEUR} caractères.`;
    } else if (nouveau === actuel) {
      suivantes.nouveau = "Le nouveau doit être différent de l'actuel.";
    }
    if (nouveau !== confirmation) suivantes.confirmation = "Les deux saisies diffèrent.";

    setErreurs(suivantes);
    if (Object.keys(suivantes).length > 0) return;

    setEnvoi(true);
    try {
      await AuthService.changePassword(actuel, nouveau);
      /*
        La session vient d'être révoquée côté serveur : le jeton en poche ne
        vaut plus rien. On sort proprement plutôt que de laisser le prochain
        appel échouer en 401 — et `logout` retire au passage le jeton de
        notification, tant qu'il peut encore être authentifié.
      */
      Alert.alert(
        "Mot de passe changé",
        "Vos appareils ont été déconnectés, celui-ci compris. Reconnectez-vous avec votre nouveau mot de passe.",
        [
          {
            text: "Aller à la connexion",
            onPress: async () => {
              await logout();
              router.replace("/login");
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      /*
        Django renvoie `{'error': "…"}` sur cette route — ni `detail`, ni une
        liste par champ. « Mot de passe actuel incorrect » se range sous le
        champ concerné plutôt que dans une alerte : c'est là qu'on regarde.
      */
      const brut =
        error instanceof ApiError
          ? ((error.payload as Record<string, unknown> | undefined)?.error ??
            (error.payload as Record<string, unknown> | undefined)?.detail)
          : null;
      const message =
        typeof brut === "string" ? brut : "Le mot de passe n'a pas pu être changé.";

      if (message.toLowerCase().includes("actuel")) {
        setErreurs({ actuel: message });
      } else {
        setErreurs({ nouveau: message });
      }
      setEnvoi(false);
    }
  }, [actuel, nouveau, confirmation, logout, router]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title="Changer le mot de passe" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Après le changement, tous vos appareils seront déconnectés — celui-ci
          compris.
        </Text>

        <Input
          label="Mot de passe actuel"
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
          error={erreurs.confirmation ?? (desaccord ? "Les deux saisies diffèrent." : undefined)}
        />

        <Button
          label="Changer le mot de passe"
          onPress={submit}
          loading={envoi}
          disabled={envoi}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.lg,
    paddingBottom: Space.xxl,
    gap: Space.lg,
  },
  lead: { ...Type.body, color: Ink[500] },
});
