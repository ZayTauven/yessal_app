/**
 * app/(app)/_layout.tsx — la couche authentifiée.
 *
 * Trois responsabilités, et rien d'autre :
 *   1. la garde d'authentification ;
 *   2. la pile — les onglets, la feuille Jëf, les destinations secondaires ;
 *   3. le tiroir, monté UNE fois au-dessus de tout, piloté par `useUiStore`.
 *
 * La barre d'onglets a été descendue dans `(tabs)/_layout.tsx`. Les deux
 * groupes sont entre parenthèses : ils ne paraissent pas dans l'URL, donc
 * `/home`, `/campaigns`, `/donate`… sont inchangés. Aucun lien profond ne casse.
 *
 * ⚠ `donate` n'est plus un onglet. §2 : « le bouton central n'est pas un onglet
 * mais un déclencheur de flux modal — contribuer n'est pas une destination,
 * c'est une action. » Il est ici, en feuille, par-dessus l'onglet courant.
 */
import { Redirect, Stack, useSegments } from "expo-router";
import { View, StyleSheet } from "react-native";

import { Sidebar } from "@/components/navigation/Sidebar";
import { useAuthStore } from "@/store/auth.store";
import { Radius, Surface } from "@/theme";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  /**
   * La route active, pour marquer la ligne courante du tiroir. Les segments
   * sont p. ex. `["(app)", "(tabs)", "home"]` : on ne garde que le dernier,
   * les groupes n'étant pas des segments d'URL.
   */
  const activeRoute = `/${segments[segments.length - 1] ?? ""}`;

  return (
    <View style={styles.shell}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />

        {/*
          Le flux Jëf. Feuille pleine hauteur : les cinq étapes portent un pavé
          numérique, un palier intermédiaire les couperait en deux.
          ⚠ `sheetGrabberVisible` est iOS seulement — sur Android, la feuille se
          referme au geste et au bouton retour, sans poignée dessinée.
        */}
        <Stack.Screen
          name="donate"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: [1],
            sheetGrabberVisible: true,
            sheetCornerRadius: Radius.card + 4,
            sheetExpandsWhenScrolledToEdge: true,
          }}
        />

        {/* Destinations secondaires — empilées, pas modales. */}
        <Stack.Screen name="daara" />
        <Stack.Screen name="donations" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="events" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="announcements" />
      </Stack>

      <Sidebar activeRoute={activeRoute} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Surface.default },
});
