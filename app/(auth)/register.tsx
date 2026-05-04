import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
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
  Phone,
  ArrowLeft,
  Search,
  Globe,
} from "lucide-react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image as ExpoImage } from "expo-image";

import { Colors } from "@/constants/colors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DaaraPicker } from "@/components/auth/DaaraPicker";
import { AuthService } from "@/lib/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { DaaraOption } from "@/types";

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
  const [daaras, setDaaras] = useState<DaaraOption[]>([]);
  const [daaraLoading, setDaaraLoading] = useState(true);
  const [daaraRefreshing, setDaaraRefreshing] = useState(false);
  const [daaraError, setDaaraError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const selectedDaara = watch("daara_id");
  const phoneValue = watch("phone");

  const isInternational =
    phoneValue && !phoneValue.startsWith("+221") && phoneValue.startsWith("+");

  const filteredDaaras = daaras
    .filter((daara) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (daara.name?.toLowerCase().includes(q) ?? false) ||
        (daara.code?.toLowerCase().includes(q) ?? false) ||
        (daara.ldd?.toLowerCase().includes(q) ?? false)
      );
    })
    .slice(0, searchQuery.trim() ? undefined : 6);

  const loadDaaras = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setDaaraRefreshing(true);
    } else {
      setDaaraLoading(true);
    }

    setDaaraError(null);

    try {
      const items = await AuthService.getDaaras();
      const activeDaaras = items.filter((item) => item.is_active);
      setDaaras(activeDaaras);
      if (activeDaaras.length === 0) {
        setDaaraError("Aucun Daara actif n'a ete retourne par le serveur.");
      }
    } catch (e) {
      setDaaraError(
        "Impossible de charger la liste des Daaras. Verifiez le backend sur le reseau local.",
      );
      console.warn("Failed to load Daaras for registration.", e);
    } finally {
      setDaaraLoading(false);
      setDaaraRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDaaras();
    return () => {
      clearError();
    };
  }, [clearError, loadDaaras]);

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
      Alert.alert(
        "Compte créé",
        "Votre compte a été envoyé pour validation. Vous pourrez vous connecter dès qu'un administrateur l'aura activé.",
        [{ text: "OK", onPress: () => router.replace("/login" as any) }],
      );
    } catch {
      // error handled by store banner
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Organic Decoration */}
      <ExpoImage
        source={require("@/assets/images/cosy-green-plant-removebg-preview.png")}
        style={styles.decoration}
        contentFit="contain"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={daaraRefreshing}
              onRefresh={() => loadDaaras(true)}
              tintColor={Colors.accent.DEFAULT}
              colors={[Colors.accent.DEFAULT]}
            />
          }
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <ArrowLeft size={20} color={Colors.ink.muted} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>

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
              <View style={{ flex: 1 }}>
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
                      icon={<User size={16} color={Colors.ink.faint} />}
                    />
                  )}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
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
                      icon={<User size={16} color={Colors.ink.faint} />}
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
                  label="Email (Optionnel si téléphone rempli)"
                  placeholder="member@yessalgui.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={value}
                  onChangeText={(t) => {
                    onChange(t);
                    clearError();
                  }}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  icon={<Mail size={16} color={Colors.ink.faint} />}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="Téléphone (Optionnel si email rempli)"
                    placeholder="+221 77 000 00 00"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={(t) => {
                      onChange(t);
                      clearError();
                    }}
                    onBlur={onBlur}
                    icon={<Phone size={16} color={Colors.ink.faint} />}
                  />
                  {isInternational && (
                    <View style={styles.diasporaHint}>
                      <Globe size={12} color={Colors.accent.DEFAULT} />
                      <Text style={styles.diasporaHintText}>
                        Détecté comme membre Diaspora (Notification Push/Email
                        prioritaires).
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
                  icon={<Lock size={16} color={Colors.ink.faint} />}
                />
              )}
            />

            <View style={styles.daaraBlock}>
              <View style={styles.daaraHeader}>
                <Text style={styles.sectionTitle}>Choisir un Daara</Text>
                {daaraLoading && (
                  <ActivityIndicator
                    size="small"
                    color={Colors.accent.DEFAULT}
                  />
                )}
              </View>

              {!daaraLoading && !daaraError && daaras.length > 0 && (
                <Text style={styles.metaText}>
                  {daaras.length} daaras disponibles
                </Text>
              )}

              {!daaraLoading && daaras.length > 0 && (
                <Input
                  label="Rechercher"
                  placeholder="Nom ou code"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  icon={<Search size={16} color={Colors.ink.faint} />}
                />
              )}

              {daaraError && (
                <Text style={styles.fieldError}>{daaraError}</Text>
              )}

              {!daaraLoading && !daaraError && filteredDaaras.length > 0 && (
                <DaaraPicker
                  options={filteredDaaras}
                  value={selectedDaara}
                  onChange={(id) => {
                    setValue("daara_id", id, { shouldValidate: true });
                    clearError();
                  }}
                />
              )}

              {!daaraLoading && !daaraError && daaras.length === 0 && (
                <Text style={styles.fieldError}>
                  Aucun Daara actif disponible. Contactez l&apos;administrateur.
                </Text>
              )}

              {!daaraLoading &&
                !daaraError &&
                daaras.length > 0 &&
                filteredDaaras.length === 0 && (
                  <Text style={styles.fieldError}>
                    Aucun Daara ne correspond à votre recherche.
                  </Text>
                )}

              {errors.daara_id && (
                <Text style={styles.fieldError}>{errors.daara_id.message}</Text>
              )}
            </View>

            <View style={{ marginTop: 24 }}>
              <Button
                label="Créer mon compte"
                onPress={handleSubmit(submit)}
                loading={isLoading}
              />
            </View>
          </View>

          <View style={styles.footerWrap}>
            <Text style={styles.footer}>
              Déjà inscrit ?{" "}
              <Text
                style={styles.footerLink}
                onPress={() => router.replace("/login" as any)}
              >
                Se connecter
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  decoration: {
    position: "absolute",
    top: -40,
    left: -70,
    width: 280,
    height: 280,
    opacity: 0.18,
    zIndex: 0,
    transform: [{ rotate: "15deg" }],
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    zIndex: 1,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  backText: {
    fontSize: 14,
    color: Colors.ink.muted,
    fontFamily: "Inter_500Medium",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  kicker: {
    color: Colors.accent.DEFAULT,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_300Light",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 12,
    color: Colors.ink.muted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: "85%",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  errorBanner: {
    backgroundColor: Colors.status.error + "18",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.status.error + "40",
    padding: 14,
    marginBottom: 24,
  },
  errorBannerText: {
    fontSize: 13,
    color: Colors.status.error,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  form: {
    gap: 4,
  },
  daaraBlock: {
    marginTop: 16,
    gap: 12,
  },
  daaraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.ink.faint,
    fontFamily: "Inter_700Bold",
  },
  fieldError: {
    fontSize: 12,
    color: Colors.status.error,
    fontFamily: "Inter_400Regular",
    marginTop: -4,
  },
  diasporaHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
    marginBottom: 8,
    backgroundColor: "rgba(26, 92, 58, 0.05)",
    padding: 8,
    borderRadius: 8,
  },
  diasporaHintText: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  footerWrap: {
    marginTop: 32,
    alignItems: "center",
  },
  footer: {
    color: Colors.ink.muted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    color: Colors.accent.light,
    fontFamily: "Inter_600SemiBold",
  },
});
