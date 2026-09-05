import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Mail,
  Lock,
  User,
  Globe,
  Check,
} from "lucide-react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image as ExpoImage } from "expo-image";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SearchablePicker } from "@/components/auth/SearchablePicker";
import { CountrySheet } from "@/components/auth/CountrySheet";
import { DialPrefix } from "@/components/auth/DialPrefix";
import {
  DEFAULT_COUNTRY,
  subscriberBounds,
  type DialCountry,
} from "@/lib/dial-codes";
import { AuthService } from "@/lib/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { DaaraOption, LDDOption } from "@/types";
import {
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

const schema = z
  .object({
    first_name: z.string().min(1, "Le prénom est requis"),
    last_name: z.string().min(1, "Le nom est requis"),
    email: z
      .string()
      .email("Adresse email invalide")
      .optional()
      .or(z.literal("")),
    phone: z.string().optional(),
    password: z
      .string()
      .min(6, "Minimum 6 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre")
      .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial"),
    daara_id: z.number().int().positive("Veuillez choisir un Daara"),
  })
  .refine((data) => data.email || data.phone, {
    message: "L'email ou le téléphone est obligatoire",
    path: ["email"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [ldds, setLdds] = useState<LDDOption[]>([]);
  const [selectedLdd, setSelectedLdd] = useState<number | null>(null);
  const [lddLoading, setLddLoading] = useState(true);
  /** Un échec de chargement se DIT : un sélecteur vide et muet ne s'explique pas. */
  const [lddError, setLddError] = useState("");

  const [daaras, setDaaras] = useState<DaaraOption[]>([]);
  const [daaraLoading, setDaaraLoading] = useState(false);
  const [daaraRefreshing, setDaaraRefreshing] = useState(false);
  const [daaraError, setDaaraError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      daara_id: 0,
    },
  });

  const selectedDaaraId = watch("daara_id");

  /*
    ── LE NUMÉRO SE COMPOSE, IL NE SE DEVINE PLUS ──────────────────────────
    Le champ était en saisie libre et le serveur prêtait `DEFAULT_PHONE_REGION`
    à tout numéro sans indicatif. Un membre de Marseille qui tapait
    « 06 12 34 56 78 » créait donc un compte sous `+221612345678` — un numéro
    sénégalais qui n'était pas le sien, et avec lequel il ne se serait jamais
    connecté. La porte d'entrée fabriquait des comptes inaccessibles.

    Le pays est désormais explicite : l'écran compose lui-même l'E.164 et il
    n'y a plus de région à deviner. Même sélecteur qu'à la connexion.
  */
  const [country, setCountry] = useState<DialCountry>(DEFAULT_COUNTRY);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);

  /**
   * ── LA CONFIRMATION D'INSCRIPTION ─────────────────────────────────────────
   *
   * Elle tenait dans une `Alert.alert` intitulée « Compte créé ». Fonctionnel,
   * mais c'est une boîte du système : le membre venait de rejoindre son Daara,
   * et l'application lui répondait comme à une erreur de saisie. Rien ne disait
   * non plus **ce qui allait se passer ensuite** — or le compte est créé en
   * `pending` (`accounts/views.py`) et n'ouvre rien tant qu'un responsable ne
   * l'a pas validé. Un membre qui l'ignore essaie de se connecter, échoue, et
   * conclut que l'inscription n'a pas marché.
   *
   * L'écran de succès remplace le formulaire — c'est un état terminal, pas une
   * couche par-dessus. Il retient ce qu'il faut du formulaire AVANT que celui-ci
   * ne disparaisse : le prénom, le Daara choisi, l'identifiant de connexion.
   */
  const [success, setSuccess] = useState<{
    firstName: string;
    daaraName: string | null;
    identifier: string;
    /** Le courriel de bienvenue ne part QUE si une adresse a été donnée. */
    emailSent: boolean;
  } | null>(null);

  /** `phone` reste la source de vérité du formulaire : on y écrit l'E.164. */
  const writePhone = useCallback(
    (next: DialCountry, digits: string) => {
      setValue("phone", digits ? `${next.prefix}${digits}` : "", {
        shouldValidate: false,
      });
    },
    [setValue],
  );

  const onPhoneDigits = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, subscriberBounds(country).max);
    setPhoneDigits(digits);
    writePhone(country, digits);
    clearError();
  };

  const onPhoneCountry = (next: DialCountry) => {
    /* Un indicatif plus long raccourcit la plage : on tronque plutôt que
       d'émettre un numéro hors E.164. */
    const digits = phoneDigits.slice(0, subscriberBounds(next).max);
    setCountry(next);
    setPhoneDigits(digits);
    writePhone(next, digits);
    clearError();
  };

  const isInternational = country.iso !== "SN";

  const loadInitialData = useCallback(async () => {
    setLddLoading(true);
    setLddError("");
    try {
      /*
        PAS de `filter(i => i.is_active)` ici. `LDDViewSet.queryset` ne sert
        déjà que les localités actives (`accounts/views.py:207`), et refiltrer
        côté client est précisément le geste qui a rendu l'inscription
        impossible pendant des semaines : `PublicDaaraSerializer` n'envoyait
        pas `is_active`, `undefined` étant faux, la liste se vidait à tous les
        coups. Le tri appartient au serveur — c'est la seule place où la règle
        ne peut pas être contournée.
      */
      setLdds(await AuthService.getLDDs());
    } catch {
      setLddError("Impossible de charger les localités.");
    } finally {
      setLddLoading(false);
    }
  }, []);

  const loadDaaras = useCallback(async (lddId: number, isRefresh = false) => {
    if (isRefresh) {
      setDaaraRefreshing(true);
    } else {
      setDaaraLoading(true);
    }

    setDaaraError(null);

    try {
      /*
        ⚠ NE PAS REMETTRE DE FILTRE `is_active` ICI.
        `PublicDaaraSerializer` — celui que reçoit un visiteur sans jeton — ne
        sert que `id`, `name` et `ldd`. Le filtre qui vivait à cette ligne lisait
        donc `undefined`, vidait la liste, et affichait « Aucun Daara actif
        trouvé » quel que soit le contenu de la base : **l'inscription mobile
        était impossible**. Le tri des Daaras désactivés est fait par le serveur
        (`DaaraViewSet.get_queryset`), là où il ne peut pas être contourné.
      */
      const items = await AuthService.getDaaras(lddId);
      setDaaras(items);
      if (items.length === 0) {
        setDaaraError("Aucun Daara trouvé pour cette localité.");
      }
    } catch {
      setDaaraError("Impossible de charger les Daaras.");
    } finally {
      setDaaraLoading(false);
      setDaaraRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    return () => {
      clearError();
    };
  }, [clearError, loadInitialData]);

  useEffect(() => {
    if (selectedLdd) {
      loadDaaras(selectedLdd);
      setValue("daara_id", 0);
    } else {
      setDaaras([]);
    }
  }, [selectedLdd, loadDaaras, setValue]);

  const submit = async (values: FormValues) => {
    try {
      await register({
        email: values.email || undefined,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || undefined,
        daara_id: values.daara_id,
      });
      setSuccess({
        firstName: values.first_name.trim(),
        daaraName: daaras.find((d) => d.id === values.daara_id)?.name ?? null,
        /* Ce qu'il devra saisir à la connexion — l'adresse si elle existe,
           sinon le numéro composé. C'est la question qu'il se posera. */
        identifier: values.email?.trim() || values.phone || "",
        emailSent: Boolean(values.email?.trim()),
      });
    } catch {
      /* Le store porte le bandeau d'erreur : le rendu le lit dans `error`. */
    }
  };

  if (success) {
    return (
      <RegistrationSuccess
        {...success}
        onContinue={() => router.replace("/login")}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Organic Decoration */}
      <ExpoImage
        source={require("@/assets/images/plant-draw-removebg-preview.png")}
        style={styles.decoration}
        contentFit="contain"
      />

      <ScreenHeader onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={daaraRefreshing}
              onRefresh={() => selectedLdd && loadDaaras(selectedLdd, true)}
              tintColor={Violet[500]}
              colors={[Violet[500]]}
            />
          }
        >
          <View style={styles.header}>
            <ExpoImage
              source={require("@/assets/images/favicon.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.kicker}>Inscription</Text>
            <Text style={styles.title}>Rejoignez votre Daara</Text>
            <Text style={styles.subtitle}>
              Remplissez vos informations pour demander votre accès à la
              plateforme.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.half}>
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Prénom"
                      placeholder="Mamadou"
                      value={value}
                      onChangeText={(t) => {
                        onChange(t);
                        clearError();
                      }}
                      onBlur={onBlur}
                      error={errors.first_name?.message}
                      icon={<User size={16} color={Ink[300]} strokeWidth={1.5} />}
                    />
                  )}
                />
              </View>
              <View style={styles.half}>
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Nom"
                      placeholder="Diop"
                      value={value}
                      onChangeText={(t) => {
                        onChange(t);
                        clearError();
                      }}
                      onBlur={onBlur}
                      error={errors.last_name?.message}
                      icon={<User size={16} color={Ink[300]} strokeWidth={1.5} />}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Adresse e-mail"
                  /*
                    ⚠ Le libellé disait « Email (Optionnel si téléphone
                    rempli) ». La phase F l'a nettoyé — et a emporté la RÈGLE
                    avec : le schéma exige l'un OU l'autre (`refine`, en tête de
                    fichier), et plus rien ne le disait avant l'erreur de
                    soumission. Le `hint` la remet sous les yeux, à sa place.
                  */
                  hint="L'adresse e-mail ou le téléphone : l'un des deux suffit."
                  placeholder="membre@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={value}
                  onChangeText={(t) => {
                    onChange(t);
                    clearError();
                  }}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  icon={<Mail size={16} color={Ink[300]} strokeWidth={1.5} />}
                />
              )}
            />

            {/*
              `Controller` n'enveloppe plus la saisie : le champ visible porte
              les CHIFFRES d'abonné, quand `phone` porte l'E.164 composé. Le
              contrôleur ne sert donc qu'à relayer `onBlur` et l'erreur.
            */}
            <Controller
              control={control}
              name="phone"
              render={({ field: { onBlur } }) => (
                <View>
                  <Input
                    label="Téléphone"
                    hint="C'est aussi ce qui vous identifiera à la connexion."
                    placeholder={country.iso === "SN" ? "77 000 00 00" : "Votre numéro"}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={phoneDigits}
                    onChangeText={onPhoneDigits}
                    onBlur={onBlur}
                    maxLength={subscriberBounds(country).max}
                    prefixSlot={
                      <DialPrefix
                        country={country}
                        onPress={() => setCountrySheetOpen(true)}
                      />
                    }
                  />
                  {isInternational && (
                    <View style={styles.diasporaHint}>
                      <Globe size={12} color={Violet[700]} strokeWidth={1.5} />
                      <Text style={styles.diasporaHintText}>
                        Numéro international : vous serez prévenu par
                        notification et par courriel.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mot de passe"
                  placeholder="********"
                  isPassword
                  value={value}
                  onChangeText={(t) => {
                    onChange(t);
                    clearError();
                  }}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  icon={<Lock size={16} color={Ink[300]} strokeWidth={1.5} />}
                />
              )}
            />

            <View style={styles.daaraBlock}>
              <SearchablePicker
                label="1. Mon LDD"
                placeholder="Sélectionnez votre localité"
                options={ldds}
                value={selectedLdd || undefined}
                onChange={setSelectedLdd}
                loading={lddLoading}
                error={lddError}
              />

              {selectedLdd && (
                <SearchablePicker
                  label="2. Mon Daara"
                  placeholder="Rechercher mon Daara..."
                  options={daaras}
                  value={selectedDaaraId}
                  onChange={(id) => {
                    setValue("daara_id", id, { shouldValidate: true });
                    clearError();
                  }}
                  loading={daaraLoading}
                  error={daaraError || errors.daara_id?.message}
                />
              )}
            </View>

            <Button
              label="Créer mon compte"
              onPress={handleSubmit(submit)}
              loading={isLoading}
              style={styles.submit}
            />
          </View>

          <View style={styles.footerWrap}>
            <Text style={styles.footer}>
              Déjà inscrit ?{" "}
              <Text
                style={styles.footerLink}
                onPress={() => router.replace("/login")}
              >
                Se connecter
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountrySheet
        visible={countrySheetOpen}
        selected={country}
        onSelect={onPhoneCountry}
        onClose={() => setCountrySheetOpen(false)}
      />
    </SafeAreaView>
  );
}

/**
 * L'état terminal de l'inscription.
 *
 * Trois choses, dans cet ordre : que c'est fait, ce qui se passe ensuite, et
 * avec quoi se connecter. La troisième est celle qu'on oublie le plus souvent
 * et celle qu'un membre cherche le lendemain.
 *
 * ⚠ Le courriel n'est promis QUE s'il y a une adresse : `send_to_user` le
 * saute silencieusement pour un compte sans e-mail (« Courriel ignoré : le
 * membre n'a pas d'adresse » dans les journaux). Annoncer un message qui ne
 * partira jamais ferait attendre le membre pour rien.
 */
function RegistrationSuccess({
  firstName,
  daaraName,
  identifier,
  emailSent,
  onContinue,
}: {
  firstName: string;
  daaraName: string | null;
  identifier: string;
  emailSent: boolean;
  onContinue: () => void;
}) {
  const etapes = [
    daaraName
      ? `Un responsable du Daara ${daaraName} vérifie votre demande.`
      : "Un responsable de votre Daara vérifie votre demande.",
    emailSent
      ? "Vous recevez un message dès qu'elle est acceptée — pensez à regarder vos indésirables."
      : "Vous êtes prévenu dès qu'elle est acceptée.",
    identifier
      ? `Vous vous connectez ensuite avec ${identifier}.`
      : "Vous vous connectez ensuite avec l'identifiant que vous venez de choisir.",
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.successContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successHero}>
          <ExpoImage
            source={require("@/assets/images/confettis.png")}
            style={styles.confettis}
            contentFit="contain"
          />
          <View style={styles.successMark}>
            <Check size={38} color={Violet[900]} strokeWidth={2.5} />
          </View>
        </View>

        <View style={styles.successHeading}>
          {/* Le prénom : c'est la seule ligne de tout le parcours qui s'adresse
              à la personne plutôt qu'à l'utilisateur. */}
          <Text style={styles.successTitle}>Bienvenue, {firstName} !</Text>
          <Text style={styles.successLead}>
            {daaraName
              ? `Votre demande d'inscription au Daara ${daaraName} est bien partie.`
              : "Votre demande d'inscription est bien partie."}
          </Text>
        </View>

        <View style={styles.successCard}>
          <Text style={styles.successCardTitle}>Ce qui se passe maintenant</Text>
          {etapes.map((etape, index) => (
            <View key={etape} style={styles.etape}>
              <View style={styles.etapeNum}>
                <Text style={styles.etapeNumText}>{index + 1}</Text>
              </View>
              <Text style={styles.etapeText}>{etape}</Text>
            </View>
          ))}
        </View>

        {/* Dit avant qu'il n'essaie et n'échoue. */}
        <Text style={styles.successNote}>
          Votre compte n&apos;est pas encore actif : la connexion ne fonctionnera
          qu&apos;une fois la demande acceptée.
        </Text>
      </ScrollView>

      <View style={styles.successFooter}>
        <Button label="Aller à la connexion" onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  flex: { flex: 1 },
  decoration: {
    position: "absolute",
    top: -40,
    left: -70,
    width: 280,
    height: 280,
    opacity: 0.14,
    zIndex: 0,
    transform: [{ rotate: "15deg" }],
  },
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: Space.huge,
    zIndex: 1,
  },
  header: { alignItems: "center", marginBottom: Space.xxxl },
  logo: { width: 48, height: 48, marginBottom: Space.lg },
  kicker: {
    ...UIType.badgeLabel,
    color: Violet[700],
    letterSpacing: 1.5,
    marginBottom: Space.sm,
  },
  title: { ...Type.screenTitle, fontSize: 26, lineHeight: 32, color: Ink[900], textAlign: "center" },
  subtitle: {
    ...Type.body,
    color: Ink[500],
    textAlign: "center",
    maxWidth: "88%",
    marginTop: Space.md,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  half: { flex: 1 },
  errorBanner: {
    backgroundColor: "rgba(166,43,43,0.08)",
    borderRadius: Radius.input,
    ...continuous,
    padding: Space.lg,
    marginBottom: Space.xxl,
  },
  errorBannerText: { ...Type.body, color: Status.error, textAlign: "center" },
  form: { gap: Space.lg },
  daaraBlock: { marginTop: Space.xs, gap: Space.lg },
  /**
   * Le repère de saisie internationale. Violet-100 et non le vert `montant` :
   * ce n'est pas un montant, et le vert n'a qu'un seul sens dans ce produit.
   */
  diasporaHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Space.sm,
    backgroundColor: Violet[100],
    padding: Space.sm,
    borderRadius: Space.sm,
    ...continuous,
  },
  diasporaHintText: { ...Type.micro, color: Violet[900], flex: 1 },
  submit: { marginTop: Space.md },
  successContent: {
    flexGrow: 1,
    paddingHorizontal: GUTTER,
    paddingTop: Space.xxxl,
    paddingBottom: Space.xl,
    gap: Space.xxl,
    zIndex: 1,
  },
  successHero: { alignItems: "center", justifyContent: "center", height: 150 },
  confettis: { ...StyleSheet.absoluteFill, opacity: 0.5 },
  successMark: {
    width: 88,
    height: 88,
    borderRadius: Radius.chip,
    backgroundColor: Violet[300],
    alignItems: "center",
    justifyContent: "center",
  },
  successHeading: { alignItems: "center", gap: Space.sm },
  successTitle: {
    ...Type.screenTitle,
    fontSize: 26,
    lineHeight: 32,
    color: Violet[900],
    textAlign: "center",
  },
  successLead: { ...Type.body, color: Ink[500], textAlign: "center" },
  successCard: {
    backgroundColor: Surface.alt,
    borderRadius: Radius.card,
    ...continuous,
    padding: Space.xl,
    gap: Space.lg,
  },
  successCardTitle: { ...UIType.chipLabel, color: Ink[500] },
  etape: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  etapeNum: {
    width: 24,
    height: 24,
    borderRadius: Radius.chip,
    backgroundColor: Violet[200],
    alignItems: "center",
    justifyContent: "center",
  },
  etapeNumText: { ...UIType.badgeLabel, color: Violet[900] },
  etapeText: { ...Type.body, color: Ink[900], flex: 1 },
  successNote: { ...Type.label, color: Status.warning, textAlign: "center" },
  successFooter: { paddingHorizontal: GUTTER, paddingBottom: Space.xl },

  footerWrap: { marginTop: Space.xxxl, alignItems: "center" },
  footer: { ...Type.body, color: Ink[500] },
  footerLink: { color: Violet[700], fontFamily: Type.label.fontFamily },
});
