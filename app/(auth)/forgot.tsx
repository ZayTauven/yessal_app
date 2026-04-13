import { useEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, ArrowLeft } from "lucide-react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Colors } from "@/constants/colors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuthStore } from "@/store/auth.store";

const schema = z.object({
  email: z.string().min(1, "L'email est requis").email("Adresse email invalide"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotScreen() {
  const router = useRouter();
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const submit = async (values: FormValues) => {
    try {
      await forgotPassword(values);
      Alert.alert(
        "Demande envoyée",
        "Si le compte existe, un email de récupération a été envoyé.",
        [{ text: "OK", onPress: () => router.replace("/login" as any) }],
      );
    } catch {
      // store handles error display
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <SectionHeader
        title="Accès oublié"
        subtitle="Recevez un lien de récupération sur votre email"
        icon={<Mail size={24} color="#FFF" />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ArrowLeft size={18} color={Colors.ink.muted} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <GlassCard style={styles.card}>
          <Text style={styles.title}>Réinitialiser l’accès</Text>
          <Text style={styles.subtitle}>
            Saisissez l’adresse email associée à votre compte membre.
          </Text>

          {error && <Text style={styles.errorBannerText}>{error}</Text>}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
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

          <Button label="Envoyer le lien" onPress={handleSubmit(submit)} loading={isLoading} />
        </GlassCard>

        <Text style={styles.footer}>
          Besoin d’aide ?{" "}
          <Text style={styles.footerLink} onPress={() => router.replace("/contact" as any)}>
            Contacter le support
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    marginTop: -18,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: Colors.ink.muted,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    padding: 18,
  },
  title: {
    fontSize: 22,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.ink.muted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
  },
  errorBannerText: {
    backgroundColor: Colors.status.error + "18",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.status.error + "40",
    padding: 12,
    marginBottom: 14,
    color: Colors.status.error,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    color: Colors.ink.muted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 18,
  },
  footerLink: {
    color: Colors.accent.light,
    fontFamily: "Inter_600SemiBold",
  },
});
