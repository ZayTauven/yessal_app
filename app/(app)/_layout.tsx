/**
 * app/(app)/_layout.tsx — la couche authentifiée.
 *
 * Trois responsabilités, et rien d'autre :
 *   1. la garde d'authentification — et la mémoire du lien profond qu'elle refuse ;
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
import { useEffect, useRef } from "react";
import { Redirect, Stack, usePathname, useUnstableGlobalHref } from "expo-router";
import { View, StyleSheet } from "react-native";

import { Sidebar } from "@/components/navigation/Sidebar";
import { rememberPendingRoute } from "@/lib/pending-route";
import { useAuthStore } from "@/store/auth.store";
import { Radius, Surface } from "@/theme";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  /**
   * La route active, pour marquer la ligne courante du tiroir — et, quand la
   * garde refuse, la cible à mémoriser.
   *
   * `usePathname()` rend le chemin PUBLIC : les groupes en sont retirés, les
   * segments dynamiques sont résolus. `/profile/tutelle` sort tel quel, là où
   * le dernier segment brut donnait `/tutelle` et ne marquait plus rien au
   * tiroir — un défaut que le déplacement des sept routes sous `(app)` rendait
   * visible, ces écrans montant désormais le tiroir avec eux.
   */
  const pathname = usePathname();

  /**
   * Le chemin ne porte pas la chaîne de requête. `useUnstableGlobalHref` est la
   * seule voie vers elle ; on n'en prend QUE cette part, pour que la disparition
   * de cette API privée coûte les paramètres et non le rejeu lui-même.
   */
  const globalHref = useUnstableGlobalHref();
  const cut = globalHref.search(/[?#]/);
  const target = cut === -1 ? pathname : pathname + globalHref.slice(cut);

  /**
   * A-t-on déjà vu une session sur ce montage ? C'est ce qui sépare une ARRIVÉE
   * refusée d'un DÉPART.
   *
   * Un lien profond reçu déconnecté arrive sans jamais avoir eu de session : on
   * mémorise, on rejouera. Une déconnexion volontaire passe par le même chemin
   * de code — la garde se réveille, `isAuthenticated` vient de tomber — mais
   * elle a vu la session : mémoriser l'écran qu'on vient de quitter y ramènerait
   * à la connexion suivante, ce que personne n'a demandé.
   */
  const hasHadSession = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      hasHadSession.current = true;
      return;
    }
    if (isLoading) return;
    if (hasHadSession.current) return;
    rememberPendingRoute(target);
  }, [isAuthenticated, isLoading, target]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

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

        {/*
          Les sept routes rapatriées sous la garde (§7, point 7). Elles vivaient
          à la racine de `app/` : un lien profond les ouvrait SANS session. Le
          déplacement ne change aucune URL — `(app)` est un groupe.
          Mêmes options que les destinations secondaires ci-dessus : aucune.
        */}
        <Stack.Screen name="campaign/[id]" />
        <Stack.Screen name="campaign/etat-[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="news/[slug]" />
        <Stack.Screen name="profile/documents" />
        <Stack.Screen name="profile/tutelle" />
      </Stack>

      <Sidebar activeRoute={pathname} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: Surface.default },
});
