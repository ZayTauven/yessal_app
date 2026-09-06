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
 * ── UN SEUL CHAMP TÉLÉPHONE, AVEC SÉLECTEUR D'INDICATIF ────────────────────
 *
 * Le champ porte un sélecteur de pays — `+221` par défaut — exactement comme le
 * formulaire web (`PhoneNumberValidation`, sur `react-phone-input-2`). Un
 * membre de Dakar ne voit aucune différence ; un membre de Marseille ouvre la
 * liste et choisit `+33`.
 *
 * ⚠ CE SÉLECTEUR FERME UNE IMPASSE, IL N'EST PAS UN CONFORT.
 *
 * L'écran figeait `+221`. Or l'inscription accepte un compte avec le SEUL
 * numéro (`refine` sur `email || phone`) et **anticipe explicitement les
 * numéros étrangers** : elle affiche un repère « Numéro international ». Un
 * membre de la diaspora inscrit avec son numéro français et sans adresse se
 * retrouvait donc avec un compte auquel il ne pouvait **ni se connecter** —
 * l'écran forçait `+221` — **ni accéder par la récupération**, qui ne cherche
 * que par e-mail (§7.9). Compte créé, accès perdu, définitivement.
 *
 * Rien à changer côté serveur : `LoginSerializer.validate`
 * (`accounts/serializers.py:506`) passe déjà l'identifiant par
 * `looks_like_phone` puis `normalize_phone_quietly`, et interroge la base sur
 * la saisie ET sur sa forme E.164. Le verrou était entièrement ici.
 *
 * ── Le pavé maison survit au sélecteur ─────────────────────────────────────
 *
 * Il a d'abord semblé que l'indicatif variable le condamnerait : `PHONE_LENGTH`
 * valait 9 et le groupement était 2-3-2-2, deux règles sénégalaises. Elles sont
 * passées dans `lib/dial-codes.ts`, qui les rend fonction du pays — longueur
 * exacte pour le Sénégal, plage E.164 (6 à 15 chiffres, indicatif compris)
 * ailleurs. Le pavé reste donc en place, et avec lui la raison qui l'a fait
 * naître : les claviers numériques Android varient d'un constructeur à l'autre
 * et masquent le bouton de validation.
 *
 * Le lien « J'ai une adresse e-mail » redevient ce qu'il était : la porte de
 * ceux qui n'ont pas de numéro, et non un rattrapage pour la diaspora.
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
import { AlertCircle, ChevronDown, ChevronLeft } from "lucide-react-native";

import { Button, IconButton } from "@/components/ui/Button";
import { CountrySheet } from "@/components/auth/CountrySheet";
import { Input } from "@/components/ui/Input";
import { NumericKeypad } from "@/components/donation/NumericKeypad";
import {
  DEFAULT_COUNTRY,
  groupDigits,
  isComplete,
  subscriberBounds,
  type DialCountry,
} from "@/lib/dial-codes";
import { consumePendingRoute } from "@/lib/pending-route";
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


export default function Login() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [digits, setDigits] = useState("");
  const [country, setCountry] = useState<DialCountry>(DEFAULT_COUNTRY);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [byEmail, setByEmail] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  /** Erreur de saisie locale, distincte de l'erreur renvoyée par le serveur. */
  const [localError, setLocalError] = useState("");

  /**
   * OÙ ATTERRIT-ON APRÈS LA CONNEXION ?
   *
   * Sur l'écran demandé, s'il y en avait un. Un membre qui reçoit le lien d'un
   * Ndiguel par WhatsApp alors qu'il est déconnecté est renvoyé ici par la
   * garde de `app/(app)/_layout.tsx`, qui a mémorisé sa destination ; il doit
   * y atterrir, pas sur l'accueil. Sinon — cas courant — l'accueil.
   *
   * `consumePendingRoute` lit ET efface : un rejeu qui traînerait se
   * rejouerait à la connexion suivante. Elle ne rend qu'une route interne
   * connue, et rien au-delà de dix minutes ; voir `lib/pending-route.ts`.
   */
  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    consumePendingRoute().then((target) => {
      if (alive) router.replace(target ?? "/home");
    });
    return () => {
      alive = false;
    };
  }, [isAuthenticated, router]);

  useEffect(() => clearError, [clearError]);

  /** E.164 composé : l'indicatif choisi, puis les chiffres d'abonné. */
  const identifier = byEmail ? email.trim() : `${country.prefix}${digits}`;
  const banner = localError || error;

  function reset() {
    setLocalError("");
    clearError();
  }

  /**
   * Changer de pays raccourcit parfois la plage : « +221 » laisse douze
   * chiffres d'abonné, « +1 » en laisse quatorze, mais un indicatif à trois
   * chiffres n'en laisse que douze. On tronque plutôt que de laisser un numéro
   * hors plage partir au serveur — et on efface l'erreur, qui parlait de
   * l'ancien pays.
   */
  function chooseCountry(next: DialCountry) {
    setCountry(next);
    setDigits((current) => current.slice(0, subscriberBounds(next).max));
    reset();
  }

  function openPad() {
    Keyboard.dismiss();
    reset();
    setPadOpen(true);
  }

  async function submit() {
    /*
      La longueur exacte n'est connue que pour le Sénégal ; ailleurs on s'en
      tient à la plage E.164 et on laisse le serveur juger. Voir
      `lib/dial-codes.ts` — prétendre connaître la longueur d'un numéro indien
      serait inventer une règle.
    */
    if (!byEmail && !isComplete(country, digits)) {
      setLocalError(
        country.iso === "SN"
          ? "Numéro incomplet — 9 chiffres attendus après l'indicatif."
          : "Numéro trop court pour cet indicatif.",
      );
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
  const phoneInvalid = Boolean(localError) && !isComplete(country, digits);

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
              {/*
                DEUX zones tactiles dans un seul champ : l'indicatif ouvre la
                liste des pays, le reste ouvre le pavé. Elles sont des frères
                et non imbriquées — un Pressable dans un Pressable rend la
                cible intérieure inatteignable sur Android.
              */}
              <View
                style={[
                  styles.phoneField,
                  padOpen && styles.phoneFieldFocus,
                  phoneInvalid && styles.phoneFieldError,
                ]}
              >
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setPadOpen(false);
                    reset();
                    setSheetOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Indicatif ${country.name}, ${country.prefix}. Changer de pays`}
                  hitSlop={{ top: 8, bottom: 8, left: 8 }}
                  style={({ pressed }) => [styles.dialZone, pressed && styles.dialZonePressed]}
                >
                  <Text style={styles.flag}>{country.flag}</Text>
                  <Text style={styles.dialCode}>{country.prefix}</Text>
                  <ChevronDown size={14} color={Ink[300]} strokeWidth={2} />
                </Pressable>

                <View style={styles.divider} />

                <Pressable
                  onPress={openPad}
                  accessibilityRole="button"
                  accessibilityLabel={
                    phoneFilled
                      ? `Téléphone ${country.prefix} ${groupDigits(country, digits)}`
                      : "Saisir votre numéro de téléphone"
                  }
                  hitSlop={{ top: 8, bottom: 8, right: 8 }}
                  style={styles.digitsZone}
                >
                  <Text
                    style={[styles.phoneValue, !phoneFilled && styles.phonePlaceholder]}
                    numberOfLines={1}
                  >
                    {phoneFilled
                      ? groupDigits(country, digits)
                      : country.iso === "SN"
                        ? "77 000 00 00"
                        : "Votre numéro"}
                  </Text>
                  {padOpen ? <View style={styles.caret} /> : null}
                </Pressable>
              </View>
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

          {/*
            ⚠ LA RÉCUPÉRATION NE MARCHE QUE PAR COURRIEL.

            `ForgotPasswordView` (`accounts/views.py:1046`) cherche
            EXCLUSIVEMENT par adresse e-mail. Or l'inscription autorise un
            compte téléphone seul : un tel membre lisait « Mot de passe
            oublié ? » sur son propre écran de connexion et suivait un lien qui
            ne pouvait rien pour lui.

            Le lien reste, parce qu'un membre en mode téléphone peut très bien
            avoir une adresse. Mais en mode téléphone il DIT ce qu'il fait, au
            lieu de le laisser découvrir à l'écran suivant.
          */}
          <Pressable
            onPress={() => router.push("/forgot")}
            style={styles.forgot}
            accessibilityRole="link"
            accessibilityLabel={
              byEmail
                ? "Mot de passe oublié ?"
                : "Mot de passe oublié ? La réinitialisation se fait par courriel."
            }
          >
            <Text style={styles.forgotLabel}>
              {byEmail ? "Mot de passe oublié ?" : "Oublié ? Réinitialiser par courriel"}
            </Text>
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
            maxLength={subscriberBounds(country).max}
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

      <CountrySheet
        visible={sheetOpen}
        selected={country}
        onSelect={chooseCountry}
        onClose={() => setSheetOpen(false)}
      />
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
  /*
    L'indicatif et les chiffres sont deux cibles tactiles distinctes dans un
    même champ. La zone d'indicatif prend toute la hauteur du champ pour offrir
    ses 44 px de haut sans agrandir le champ lui-même.
  */
  dialZone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "stretch",
    justifyContent: "center",
    paddingRight: 2,
  },
  dialZonePressed: { opacity: 0.6 },
  digitsZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
  },
  /* Le drapeau emoji rendu à la taille du texte paraît rabougri. */
  flag: { fontSize: 20, lineHeight: 24 },
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
