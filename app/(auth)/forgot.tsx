/**
 * app/(auth)/forgot.tsx — la réinitialisation, passée au système (phase F).
 *
 * Écran hérité (§5.2) : tokens et composants, pas de refonte. `SectionHeader`
 * devient `ScreenHeader`, `GlassCard` devient `Card`.
 *
 * ⚠ **La récupération ne fonctionne QUE par e-mail.**
 * `accounts/views.py:1046` cherche exclusivement par adresse. Un membre inscrit
 * avec son seul numéro n'a aucun moyen de reprendre son compte — la lacune est
 * portée au §7.9 du plan, elle attend un arbitrage produit.
 *
 * Jusque-là, l'écran le **dit** plutôt que de le taire : une personne qui ne
 * connaît pas son adresse doit savoir tout de suite qu'elle perd son temps ici,
 * et où aller. C'est la raison du lien vers le support, remonté en évidence.
 */
import { useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAuthStore } from "@/store/auth.store";
import {
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

const schema = z.object({
  email: z.string().min(1, "L'adresse e-mail est requise").email("Adresse e-mail invalide"),
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
        "Si un compte porte cette adresse, un lien de récupération vient d'y être envoyé.",
        [{ text: "OK", onPress: () => router.replace("/login") }],
      );
    } catch {
      // Le store porte le message : le rendu le lit dans `error`.
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader title="Mot de passe oublié" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.title}>Réinitialiser l&apos;accès</Text>
          <Text style={styles.subtitle}>
            Saisissez l&apos;adresse e-mail associée à votre compte. Vous
            recevrez un lien pour choisir un nouveau mot de passe.
          </Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Adresse e-mail"
                placeholder="membre@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  clearError();
                }}
                onBlur={onBlur}
                error={errors.email?.message}
                icon={<Mail size={16} color={Ink[300]} strokeWidth={1.5} />}
              />
            )}
          />

          <Button
            label="Envoyer le lien"
            onPress={handleSubmit(submit)}
            loading={isLoading}
            style={styles.submit}
          />
        </Card>

        {/* La lacune du §7.9, dite plutôt que tue. */}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Inscrit avec votre seul numéro ?</Text>
          <Text style={styles.noticeBody}>
            La récupération passe aujourd&apos;hui par l&apos;adresse e-mail. Si
            votre compte n&apos;en porte pas, le support rouvre votre accès.
          </Text>
          <Button
            label="Contacter le support"
            variant="outline"
            size="md"
            onPress={() => router.push("/contact")}
            style={styles.noticeAction}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: Space.xxxl,
    gap: Space.xl,
  },
  card: { gap: Space.md },
  title: { ...Type.cardTitle, color: Ink[900] },
  subtitle: { ...Type.body, color: Ink[500] },
  errorBanner: {
    ...Type.body,
    color: Status.error,
    backgroundColor: "rgba(166,43,43,0.08)",
    borderRadius: Radius.input,
    ...continuous,
    padding: Space.md,
    textAlign: "center",
  },
  submit: { marginTop: Space.xs },
  notice: {
    backgroundColor: Surface.alt,
    borderRadius: Radius.card,
    ...continuous,
    padding: Space.xl,
    gap: Space.sm,
  },
  noticeTitle: { ...Type.label, color: Violet[900] },
  noticeBody: { ...Type.body, color: Ink[500] },
  noticeAction: { marginTop: Space.sm },
});
