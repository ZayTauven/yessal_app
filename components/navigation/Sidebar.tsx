/**
 * Sidebar — le tiroir de navigation.
 *
 * Planche « Accueil et Onglets » : panneau de 302 px à gauche, fond blanc,
 * voile violet-950 à 42 %. En-tête d'identité, liste de destinations, et un
 * pied qui porte l'invitation et la déconnexion.
 *
 * « Le menu porte ce que les onglets ne peuvent pas. » Quatre onglets suffisent
 * au quotidien ; Mon Daara, les tutelles, les paramètres et la vue collecteur
 * sont des destinations occasionnelles. La vue collecteur porte une pastille de
 * rôle, parce qu'elle change ce que l'application montre.
 *
 * Réécriture complète (phase C). L'ancien tiroir portait à lui seul 12 des 26
 * problèmes de lint du projet : `useRef(new Animated.Value()).current` lu
 * pendant le rendu, et un `setState` synchrone dans un effet. Reanimated
 * supprime les deux — la valeur animée n'est plus une ref lue au rendu, et la
 * présence est pilotée par un style animé, pas par un état React.
 */
import { useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { HeartHandshake, X } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import type { UserRole } from "@/types/auth.types";
import {
  Font,
  Ink,
  Radius,
  Shadow,
  Space,
  Status,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

/** Largeur du contrat. Bornée sur les petits écrans — 302 sur un 320 étouffe. */
const PANEL_WIDTH = 302;

const OPEN_MS = 260;
const CLOSE_MS = 200;

interface DrawerItem {
  label: string;
  /**
   * Typée `Href` et non `string` : `typedRoutes` est actif, donc une route
   * mal orthographiée ici échoue à la compilation au lieu de mener à un écran
   * blanc au clic. C'est le seul intérêt de `typedRoutes`, autant s'en servir.
   */
  route: Href;
  /** Rôles autorisés. Absent = tout le monde. */
  roles?: UserRole[];
  /** Pastille : un nombre de non-lus, ou le mot « Rôle ». */
  badge?: "role";
}

/**
 * L'ordre est celui de la planche. Les quatre premières entrées doublent les
 * onglets — c'est voulu : le tiroir est aussi une carte du produit, et un
 * utilisateur qui l'ouvre doit y retrouver où il est.
 */
const ITEMS: DrawerItem[] = [
  { label: "Accueil", route: "/home" },
  { label: "Ndiguels", route: "/campaigns" },
  { label: "Mon Daara", route: "/daara" },
  { label: "Messages", route: "/chat" },
  { label: "Mes Jëfs", route: "/donations" },
  { label: "Mes tutelles", route: "/profile/tutelle" },
  { label: "Actualités", route: "/explore" },
  { label: "Événements", route: "/events", roles: ["admin"] },
  {
    label: "Vue collecteur",
    route: "/donate",
    roles: ["collector", "chef_daara", "admin"],
    badge: "role",
  },
  { label: "Aide & contact", route: "/contact" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  chef_daara: "Chef de Daara",
  collector: "Collecteur",
  member: "Talibé",
  tutelle: "Tutelle",
};

interface SidebarProps {
  /** Route active, pour marquer la ligne courante. Ex. « /home ». */
  activeRoute?: string;
}

export function Sidebar({ activeRoute }: SidebarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  const { drawerOpen, closeDrawer } = useUiStore();

  const panelWidth = Math.min(PANEL_WIDTH, Math.round(width * 0.86));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(drawerOpen ? 1 : 0, {
      duration: drawerOpen ? OPEN_MS : CLOSE_MS,
      easing: drawerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [drawerOpen, progress]);

  /**
   * `display` fait sortir le tiroir de l'arbre tactile une fois refermé.
   * Il est piloté DANS le style animé, sur le fil natif : pas d'état React,
   * donc pas de rendu en cascade — c'est ce qui coûtait 12 avertissements.
   */
  const backdrop = useAnimatedStyle(() => ({
    opacity: progress.value,
    display: progress.value === 0 ? "none" : "flex",
  }));

  const panel = useAnimatedStyle(() => ({
    transform: [{ translateX: -panelWidth * (1 - progress.value) }],
    display: progress.value === 0 ? "none" : "flex",
  }));

  const role = user?.role;
  const items = ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : "Membre Yessal";
  const daaraName = user?.daara_name ?? user?.daara?.name;
  const subtitle = [role ? ROLE_LABELS[role] : null, daaraName]
    .filter(Boolean)
    .join(" · ");

  function go(route: Href) {
    closeDrawer();
    router.push(route);
  }

  async function handleLogout() {
    closeDrawer();
    await logout();
    router.replace("/login");
  }

  return (
    <View style={styles.screen} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdrop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeDrawer}
          accessibilityRole="button"
          accessibilityLabel="Fermer le menu"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { width: panelWidth, paddingTop: insets.top + Space.xl },
          panel,
        ]}
      >
        <View style={styles.identity}>
          <Avatar
            uri={user?.avatar_url ?? user?.avatar}
            name={fullName}
            size={52}
          />
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName}
            </Text>
            {subtitle ? (
              <Text style={styles.role} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={closeDrawer}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Fermer le menu"
          >
            <X size={16} color={Ink[900]} strokeWidth={1.8} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const active = activeRoute === item.route;
            return (
              <Pressable
                key={item.label}
                onPress={() => go(item.route)}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.item,
                  active && styles.itemActive,
                  pressed && !active && styles.itemPressed,
                ]}
              >
                <View style={[styles.dot, active && styles.dotActive]} />
                <Text
                  style={[styles.itemLabel, active && styles.itemLabelActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {item.badge === "role" ? (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeLabel}>Rôle</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Space.xl }]}>
          <Pressable
            onPress={() => go("/daara")}
            accessibilityRole="button"
            style={({ pressed }) => [styles.invite, pressed && styles.itemPressed]}
          >
            {/* Pictogramme provisoire — le jeu de dix tracés originaux reste dû. */}
            <View style={styles.invitePicto}>
              <HeartHandshake size={24} color={Violet[900]} strokeWidth={1.5} />
            </View>
            <Text style={styles.inviteLabel}>Inviter un proche au Daara</Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            style={({ pressed }) => [styles.logout, pressed && styles.itemPressed]}
          >
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, zIndex: 50 },
  /** Violet-950 à 42 % — la valeur de la planche. */
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(25,11,61,0.42)" },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Surface.default,
    boxShadow: Shadow.tabbar,
    paddingHorizontal: 18,
    gap: Space.xl,
  },

  identity: { flexDirection: "row", alignItems: "center", gap: Space.md },
  identityText: { flex: 1, gap: 2 },
  name: { ...UIType.rowTitle, color: Violet[900] },
  role: { ...Type.label, color: Ink[500] },
  close: {
    width: 36,
    height: 36,
    borderRadius: Radius.chip,
    backgroundColor: Surface.btn,
    alignItems: "center",
    justifyContent: "center",
  },

  list: { flex: 1 },
  listContent: { gap: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: Radius.card,
    ...continuous,
    paddingHorizontal: 14,
    gap: Space.md,
  },
  itemActive: { backgroundColor: Violet[100] },
  itemPressed: { opacity: 0.72 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.chip,
    backgroundColor: Ink[100],
  },
  dotActive: { backgroundColor: Violet[500] },
  itemLabel: { flex: 1, fontFamily: Font.semibold, fontSize: 15, lineHeight: 19, color: Ink[900] },
  itemLabelActive: { fontFamily: Font.bold, color: Violet[900] },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.chip,
    backgroundColor: Surface.btn,
  },
  roleBadgeLabel: { ...UIType.badgeLabel, color: Ink[500] },

  footer: { gap: Space.md },
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: 14,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Violet[100],
  },
  invitePicto: {
    width: 44,
    height: 44,
    borderRadius: 14,
    ...continuous,
    backgroundColor: Violet[200],
    alignItems: "center",
    justifyContent: "center",
  },
  inviteLabel: {
    flex: 1,
    fontFamily: Font.semibold,
    fontSize: 12,
    lineHeight: 17,
    color: Violet[900],
  },
  logout: {
    height: 44,
    borderRadius: Radius.button,
    backgroundColor: Surface.btn,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLabel: { ...UIType.chipLabel, color: Status.error },
});
