/**
 * app/(auth)/login.tsx — la connexion.
 *
 * Planche « Onboarding et Connexion ». Chevron de retour 44, titre 32 / 800,
 * champ téléphone à indicatif `+221` figé qui ouvre un pavé numérique maison,
 * mot de passe, et le bouton en bas.
 *
 * POURQUOI UN PAVÉ MAISON : le clavier numérique d'Android varie d'un
 * constructeur à l'autre, pousse l'écran vers le haut et masque le bouton de
 * validation. Le pavé est celui du contrat (`NumericKeypad`), posé dans une
 * feuille basse.
 *
 * ⚠ LIMITE CONNUE — le format du numéro stocké.
 * `accounts/serializers.py:445` cherche l'utilisateur par
 * `Q(email__iexact=identifier) | Q(phone=identifier)` : la correspondance sur
 * le téléphone est EXACTE, et `accounts/models.py` ne normalise rien — il ne
 * fait qu'un `.strip()`. Or le formulaire d'inscription propose
 * « +221 77 000 00 00 », espaces compris. Un compte enregistré avec des
 * espaces, ou sans indicatif, ne sera pas retrouvé par ce que cet écran émet
 * (`+221` suivi des neuf chiffres, sans séparateur).
 *
 * D'où le lien « J'ai une adresse e-mail » : il bascule le champ en saisie
 * libre et envoie l'identifiant tel quel. Sans lui, un compte administrateur
 * créé par e-mail ne pourrait pas se connecter du tout.
 *
 * La correction de fond est côté Django — normaliser `phone` à l'écriture et
 * migrer l'existant. Voir §7 du plan d'implémentation.
 */
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { SlideInDown } from "react-native-reanimated";
import { AlertCircle, ChevronLeft } from "lucide-react-native";

import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumericKeypad } from "@/components/donation/NumericKeypad";
import { NBSP } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import {
  Border,
  Font,
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

/** Un numéro sénégalais : neuf chiffres après l'indicatif. */
const PHONE_LENGTH = 9;
const DIAL_CODE = "+221";

/** Groupement 2-3-2-2, à l'espace insécable — « 77 641 22 08 ». */
function formatPhone(digits: string): string {
  const groups = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ].filter(Boolean);
  return groups.join(NBSP);
}

export default function Login() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [digits, setDigits] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [byEmail, setByEmail] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  /** Erreur de saisie locale, distincte de l'erreur renvoyée par le serveur. */
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isAuthenticated) router.replace("/home");
  }, [isAuthenticated, router]);

  useEffect(() => clearError, [clearError]);

  const identifier = byEmail ? email.trim() : `${DIAL_CODE}${digits}`;
  const banner = localError || error;

  function reset() {
    setLocalError("");
    clearError();
  }

  function openPad() {
    Keyboard.dismiss();
    reset();
    setPadOpen(true);
  }

  async function submit() {
    if (!byEmail && digits.length < PHONE_LENGTH) {
      setLocalError(`Numéro incomplet — ${PHONE_LENGTH} chiffres attendus.`);
      return;
    }
    if (byEmail && !email.trim()) {
      setLocalError("Saisissez votre adresse e-mail.");
      return;
    }
    if (!password) {
      setLocalError("Saisissez votre mot de passe.");
      return;
    }

    setPadOpen(false);
    try {
      await login({ identifier, password });
    } catch {
      /* Le magasin porte le message. */
    }
  }

  const phoneFilled = digits.length > 0;
  const phoneInvalid = Boolean(localError) && digits.length < PHONE_LENGTH;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <IconButton
          icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
          onPress={() => router.replace("/onboarding")}
          accessibilityLabel="Revenir"
        />

        <View style={styles.heading}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Réservé aux membres de la confrérie.</Text>
        </View>

        {banner ? (
          <View style={styles.banner}>
            <AlertCircle size={18} color={Status.error} strokeWidth={1.5} />
            <Text style={styles.bannerText} selectable>
              {banner}
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {byEmail ? (
            <Input
              label="Adresse e-mail"
              placeholder="vous@exemple.sn"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                reset();
              }}
              containerStyle={styles.field}
            />
          ) : (
            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  padOpen && styles.labelFocus,
                  phoneInvalid && styles.labelError,
                ]}
              >
                Téléphone
              </Text>
              <Pressable
                onPress={openPad}
                accessibilityRole="button"
                accessibilityLabel={
                  phoneFilled
                    ? `Téléphone ${DIAL_CODE} ${formatPhone(digits)}`
                    : "Saisir votre numéro de téléphone"
                }
                style={[
                  styles.phoneField,
                  padOpen && styles.phoneFieldFocus,
                  phoneInvalid && styles.phoneFieldError,
                ]}
              >
                <Text style={styles.dialCode}>{DIAL_CODE}</Text>
                <View style={styles.divider} />
                <Text
                  style={[styles.phoneValue, !phoneFilled && styles.phonePlaceholder]}
                >
                  {phoneFilled ? formatPhone(digits) : "77 000 00 00"}
                </Text>
                {padOpen ? <View style={styles.caret} /> : null}
              </Pressable>
            </View>
          )}

          <Input
            label="Mot de passe"
            isPassword
            placeholder="••••••"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              reset();
            }}
            onFocus={() => setPadOpen(false)}
            containerStyle={styles.field}
          />

          <Pressable
            onPress={() => router.push("/forgot")}
            style={styles.forgot}
            accessibilityRole="link"
          >
            <Text style={styles.forgotLabel}>Mot de passe oublié ?</Text>
          </Pressable>
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Button label="Se connecter" onPress={submit} loading={isLoading} />

          <Pressable
            onPress={() => {
              setByEmail((v) => !v);
              setPadOpen(false);
              reset();
            }}
            accessibilityRole="button"
            style={styles.switchMode}
          >
            <Text style={styles.switchModeLabel}>
              {byEmail
                ? "Me connecter avec mon numéro"
                : "J'ai une adresse e-mail"}
            </Text>
          </Pressable>

          <Text style={styles.signup}>
            {"Pas encore membre ? "}
            <Text style={styles.signupLink} onPress={() => router.push("/register")}>
              Créer un compte
            </Text>
          </Text>
        </View>
      </ScrollView>

      {padOpen ? (
        <Animated.View entering={SlideInDown.duration(180)} style={styles.pad}>
          <View style={styles.grabber} />
          <NumericKeypad
            value={digits}
            onChange={(next) => {
              setDigits(next);
              reset();
            }}
            maxLength={PHONE_LENGTH}
            thousandsKey={false}
            keyHeight={60}
          />
          <Button
            label="Terminé"
            onPress={() => setPadOpen(false)}
            variant="secondary"
            size="md"
            style={styles.padDone}
          />
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },
  content: {
    flexGrow: 1,
    paddingHorizontal: GUTTER,
    paddingBottom: GUTTER,
    paddingTop: Space.sm,
  },

  heading: { marginTop: Space.xxxl, gap: Space.sm },
  title: {
    fontFamily: Font.extrabold,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.64,
    color: Violet[900],
  },
  subtitle: { ...Type.body, color: Ink[500] },

  banner: {
    marginTop: Space.xl,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: "rgba(166,43,43,0.32)",
  },
  bannerText: {
    flex: 1,
    fontFamily: Font.medium,
    fontSize: 13,
    lineHeight: 20,
    color: Status.error,
  },

  form: { marginTop: 28 },
  /** Les champs portent leur propre écart : la marge basse de `Input` est neutralisée. */
  field: { marginBottom: Space.lg },

  label: { ...Type.label, color: Ink[500] },
  labelFocus: { color: Violet[700] },
  labelError: { color: Status.error },
  phoneField: {
    marginTop: 6,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.input,
    ...continuous,
    backgroundColor: Violet[100],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  phoneFieldFocus: { borderColor: Violet[500] },
  phoneFieldError: { backgroundColor: Surface.default, borderColor: Status.error },
  dialCode: { ...UIType.fieldPrefix, color: Violet[900] },
  divider: { width: 1, height: 20, backgroundColor: Border.strong },
  phoneValue: {
    ...UIType.fieldText,
    color: Ink[900],
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.15,
  },
  phonePlaceholder: { color: Ink[300] },
  caret: { width: 2, height: 22, backgroundColor: Violet[500] },

  forgot: { alignSelf: "flex-end", height: 44, justifyContent: "center" },
  forgotLabel: { fontFamily: Font.semibold, fontSize: 12, color: Violet[700] },

  spacer: { flex: 1, minHeight: Space.xxl },

  footer: { gap: Space.lg },
  switchMode: { alignSelf: "center", height: 44, justifyContent: "center" },
  switchModeLabel: { fontFamily: Font.semibold, fontSize: 13, color: Violet[700] },
  signup: { ...Type.body, textAlign: "center", color: Ink[500] },
  signupLink: { fontFamily: Font.bold, color: Violet[700] },

  pad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Surface.default,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    boxShadow: "0 -6px 20px rgba(28,28,26,0.10)",
    paddingHorizontal: Space.md,
    paddingTop: 10,
    paddingBottom: Space.lg,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: Radius.chip,
    backgroundColor: Ink[100],
    marginBottom: 10,
  },
  padDone: { marginTop: 10 },
});
