import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, ArrowRight } from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";

import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";

const schema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Adresse email invalide"),
  password: z
    .string()
    .min(1, "Le passe est requis")
    .min(6, "Minimum 6 caractères"),
});

type FormValues = z.infer<typeof schema>;

function LogoMark() {
  return (
    <View style={styles.logoWrap}>
      <ExpoImage
        source={require("@/assets/images/favicon.png")}
        style={styles.logo}
        contentFit="contain"
      />
      <Text style={styles.logoName}>Yessal Gui</Text>
    </View>
  );
}

export default function Login() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated } =
    useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (isAuthenticated) router.replace("/home" as any);
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const onSubmit = async (values: FormValues) => {
    try {
      await login({ email: values.email, password: values.password });
    } catch {
      // error handled in store
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Organic Decoration */}
      <ExpoImage
        source={require("@/assets/images/flower-removebg-preview.png")}
        style={styles.decoration}
        contentFit="contain"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
            hitSlop={12}
          >
            <Text style={styles.backText}>{"<"} Retour</Text>
          </Pressable>

          <LogoMark />

          <View style={styles.header}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Réservé aux membres de la confrérie
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Adresse email"
                  placeholder="votre@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(t) => {
                    onChange(t);
                    clearError();
                  }}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                  icon={<Mail size={16} color={Colors.ink.faint} />}
                />
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
                  onChangeText={(t) => {
                    onChange(t);
                    clearError();
                  }}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                  icon={<Lock size={16} color={Colors.ink.faint} />}
                />
              )}
            />

            <Pressable
              style={styles.forgot}
              onPress={() => router.push("/forgot" as any)}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </Pressable>

            <Button
              label="Se connecter"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              icon={<ArrowRight size={16} color="#fff" />}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              label="Connexion avec code OTP (2FA)"
              onPress={() =>
                Alert.alert(
                  "2FA",
                  "Entrez le code envoyé par votre administrateur.",
                )
              }
              variant="outline"
            />

            <Text style={styles.footer}>
              Problème de connexion?{" "}
              <Text
                style={styles.footerLink}
                onPress={() => router.push("/contact" as any)}
              >
                Contacter le support
              </Text>
            </Text>

            <Text style={[styles.footer, { marginTop: 16 }]}>
              Pas encore membre?{" "}
              <Text
                style={styles.footerLink}
                onPress={() => router.push("/register" as any)}
              >
                Créer un compte
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
    bottom: -60,
    right: -100,
    width: 320,
    height: 320,
    opacity: 0.15,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }],
  },
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    flexGrow: 1,
    zIndex: 1,
  },
  back: {
    marginTop: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 14,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
    justifyContent: "center",
  },
  logo: {
    width: 42,
    height: 42,
  },
  logoName: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent.DEFAULT,
    letterSpacing: -0.5,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_300Light",
    color: Colors.ink.DEFAULT,
    letterSpacing: -0.8,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    textAlign: "center",
    lineHeight: 22,
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
    gap: 0,
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.DEFAULT,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 32,
  },
  footerLink: {
    color: Colors.accent.light,
    fontFamily: "Inter_600SemiBold",
  },
});
