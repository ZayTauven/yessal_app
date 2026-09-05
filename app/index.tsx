/**
 * app/index.tsx — l'aiguillage de démarrage.
 *
 * Il ne rend rien de durable : il redirige. Le seul pixel qui lui appartient
 * est l'indicateur d'attente pendant l'hydratation du jeton, passé aux tokens
 * en phase F.
 */
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuthStore } from "@/store/auth.store";
import { Surface, Violet } from "@/theme";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Violet[700]} size="large" />
      </View>
    );
  }

  if (isAuthenticated) return <Redirect href="/home" />;
  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Surface.default,
  },
});
