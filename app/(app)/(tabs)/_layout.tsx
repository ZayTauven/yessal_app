/**
 * app/(app)/(tabs)/_layout.tsx — les quatre onglets.
 *
 * Arbitrage du §2 : Accueil · Ndiguels · Messages · Profil, plus une action
 * centrale qui ouvre le flux Jëf en feuille. Le tiroir n'est PAS un onglet —
 * il s'ouvre par le bouton d'en-tête de chaque écran (`useUiStore`).
 *
 * Ce que la refonte a retiré de l'ancienne barre :
 *   — l'onglet « Jëfs » : c'est une action, pas une destination ;
 *   — l'onglet « Menu » et son écran fantôme `menu.tsx`, qui n'existait que
 *     pour occuper un emplacement et rediriger vers l'accueil ;
 *   — le couple `explore` / `events` affiché selon le rôle : deux onglets qui
 *     changeaient de nom d'un utilisateur à l'autre. Ils vivent au tiroir.
 *
 * La barre elle-même est `components/navigation/TabBar.tsx` — le composant du
 * contrat, écrit en phase B. Ici on ne fait que la nourrir.
 */
import { Tabs, useRouter } from "expo-router";
import { HandHeart, Home, MessageSquare, Scroll, User } from "lucide-react-native";

import { TabBar, type TabItem } from "@/components/navigation/TabBar";

/** L'ordre des onglets. Il fixe aussi l'ordre des `Tabs.Screen` ci-dessous. */
const TABS = [
  { name: "home", label: "Accueil", icon: Home },
  { name: "campaigns", label: "Ndiguels", icon: Scroll },
  { name: "chat", label: "Messages", icon: MessageSquare },
  { name: "profile", label: "Profil", icon: User },
] as const;

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const items: TabItem[] = TABS.map(({ name, label, icon: Icon }) => ({
          key: name,
          label,
          icon: ({ color, size }) => (
            <Icon size={size} color={color} strokeWidth={1.6} />
          ),
          onPress: () => {
            const route = state.routes.find((r) => r.name === name);
            if (!route) return;
            const focused = state.routes[state.index]?.name === name;
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          },
        }));

        return (
          <TabBar
            items={items}
            activeKey={state.routes[state.index]?.name ?? "home"}
            center={{
              icon: ({ color, size }) => (
                <HandHeart size={size} color={color} strokeWidth={1.6} />
              ),
              accessibilityLabel: "Faire un Jëf",
              onPress: () => router.push("/donate"),
            }}
          />
        );
      }}
    >
      {TABS.map(({ name }) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
