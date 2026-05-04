import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Calendar,
  Heart,
  LogOut,
  MessageSquare,
  NotebookPen,
  ShieldCheck,
  UserCircle2,
  Users,
  Wallet,
} from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/store/auth.store";

type MenuItem = {
  label: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    label: "Mon profil",
    sub: "Compte & sécurité",
    icon: UserCircle2,
    route: "/profile",
  },
  {
    label: "Mes Jëfs",
    sub: "Historique et suivi",
    icon: Wallet,
    route: "/donations",
  },
  { label: "Ndiguels", sub: "Ndiguels actifs", icon: Heart, route: "/campaigns" },
  {
    label: "Mon Daara",
    sub: "Membres et collecteurs",
    icon: Users,
    route: "/daara",
  },
  {
    label: "Tutelle familiale",
    sub: "Gestion des proches",
    icon: NotebookPen,
    route: "/profile/tutelle",
  },
  {
    label: "Communauté",
    sub: "Chat et actualités",
    icon: MessageSquare,
    route: "/chat",
  },
  {
    label: "Événements",
    sub: "Calendrier confrérique",
    icon: Calendar,
    route: "/events",
  },
];

type SidebarProps = {
  visible: boolean;
  onClose: () => void;
  onNavigate?: () => void;
};

export function Sidebar({ visible, onClose, onNavigate }: SidebarProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  const drawerWidth = Math.min(Math.round(width * 0.86), 360);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -drawerWidth,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setRendered(false);
      }
    });
  }, [backdropOpacity, drawerWidth, translateX, visible]);

  const initials = useMemo(
    () =>
      `${user?.first_name?.[0] ?? "Y"}${user?.last_name?.[0] ?? ""}`.toUpperCase(),
    [user?.first_name, user?.last_name],
  );

  const goTo = (route: string) => {
    onNavigate?.();
    router.push(route as any);
  };

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    router.replace("/login" as any);
  };

  const handleBackdropPress = (_event: GestureResponderEvent) => {
    onClose();
  };

  if (!rendered) {
    return null;
  }

  return (
    <View style={styles.screen} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          { width: drawerWidth, transform: [{ translateX }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <ExpoImage
              source={require("@/assets/images/family.jpg")}
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View style={styles.logoBox}>
                  <ExpoImage
                    source={require("@/assets/images/embleme.png")}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>Fermer</Text>
                </Pressable>
              </View>

              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {user
                      ? `${user.first_name} ${user.last_name}`
                      : "Membre Yessal"}
                  </Text>
                  <Text style={styles.role}>
                    {user?.role ?? "Compte membre"} ·{" "}
                    {user?.status ?? "Statut inconnu"}
                  </Text>
                  <View style={styles.daaraPill}>
                    <ShieldCheck size={12} color="#FFF" />
                    <Text style={styles.daaraText}>
                      {/*TODO: display actual daara name */}
                      {user?.daara_name ?? user?.daara?.name ?? "Daara lié"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Navigation</Text>
            <View style={styles.list}>
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => goTo(item.route)}
                    style={styles.item}
                  >
                    <View style={styles.iconWrap}>
                      <Icon size={18} color={Colors.accent.DEFAULT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.label}</Text>
                      <Text style={styles.itemSub}>{item.sub}</Text>
                    </View>
                    <ArrowRight size={16} color={Colors.ink.faint} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Actions rapides</Text>
            <View style={styles.quickRow}>
              <Pressable
                style={styles.quickCard}
                onPress={() => goTo("/donate")}
              >
                <Wallet size={18} color={Colors.accent.DEFAULT} />
                <Text style={styles.quickText}>Faire un Jëfs</Text>
              </Pressable>
              <Pressable
                style={styles.quickCard}
                onPress={() => goTo("/campaigns")}
              >
                <Heart size={18} color={Colors.accent.DEFAULT} />
                <Text style={styles.quickText}>Ndiguels</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.logoutRow} onPress={handleLogout}>
            <LogOut size={18} color={Colors.status.error} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 13, 9, 0.52)",
  },
  drawer: {
    height: "100%",
    backgroundColor: Colors.surface.subtle,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    boxShadow: "12px 0 30px rgba(10, 18, 12, 0.22)",
  },
  scroll: {
    paddingBottom: 36,
  },
  hero: {
    height: 220,
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 92, 58, 0.72)",
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  closeText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  name: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  role: {
    marginTop: 2,
    color: "rgba(255,255,255,0.84)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  daaraPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  daaraText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionLabel: {
    color: Colors.ink.faint,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    color: Colors.ink.DEFAULT,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  itemSub: {
    marginTop: 2,
    color: Colors.ink.muted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickCard: {
    flex: 1,
    minHeight: 96,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    gap: 8,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  quickText: {
    color: Colors.ink.DEFAULT,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  logoutRow: {
    marginHorizontal: 16,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(196, 54, 54, 0.06)",
  },
  logoutText: {
    color: Colors.status.error,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
