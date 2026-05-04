import { useState } from "react";
import { Redirect, Tabs } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { AlignLeft, Calendar, Heart, Home, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth.store";
import { Colors } from "@/constants/colors";
import { HapticTab } from "@/components/haptic-tab";
import { Sidebar } from "@/components/navigation/Sidebar";

function DonateTabButton({ onPress }: { onPress?: PressableProps["onPress"] }) {
  return (
    <Pressable onPress={onPress} style={styles.donateButton}>
      <View style={styles.donateCircle}>
        <Plus size={20} color="#FFF" strokeWidth={2} />
      </View>
      <Text style={styles.donateLabel}>Jëfs</Text>
    </Pressable>
  );
}

function MenuTabButton({ onPress }: { onPress?: PressableProps["onPress"] }) {
  return (
    <Pressable onPress={onPress} style={styles.menuButton}>
      <AlignLeft size={20} color={Colors.ink.faint} />
      <Text style={styles.menuLabel}>Menu</Text>
    </Pressable>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.shell}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: Colors.accent.DEFAULT,
          tabBarInactiveTintColor: Colors.ink.faint,
          tabBarLabelStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
            marginBottom: 0,
          },
          tabBarStyle: {
            position: "absolute",
            left: 20,
            right: 20,
            bottom: Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 14),
            height: Math.max(
              insets.bottom + 64,
              Platform.OS === "ios" ? 80 : 72,
            ),
            borderRadius: 26,
            backgroundColor: "rgba(255,255,255,0.96)",
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: "rgba(26, 92, 58, 0.08)",
            paddingTop: 8,
            paddingBottom: Math.max(
              insets.bottom,
              Platform.OS === "ios" ? 20 : 12,
            ),
            paddingHorizontal: 10,
            boxShadow: "0 10px 28px rgba(14, 24, 16, 0.10)",
          },
          tabBarItemStyle: {
            paddingVertical: 6,
            borderRadius: 18,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Accueil",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="campaigns"
          options={{
            title: "Ndiguels",
            tabBarIcon: ({ color, size }) => (
              <Heart size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="donate"
          options={{
            title: "Jëfs",
            tabBarButton: (props) => (
              <DonateTabButton onPress={props.onPress} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Événements",
            tabBarIcon: ({ color, size }) => (
              <Calendar size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            tabBarButton: () => (
              <MenuTabButton onPress={() => setDrawerOpen(true)} />
            ),
          }}
        />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="donations" options={{ href: null }} />
        <Tabs.Screen name="daara" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="announcements" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>

      <Sidebar
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={() => setDrawerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  donateButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    width: 72,
  },
  donateCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(26, 92, 58, 0.35)",
  },
  donateLabel: {
    marginTop: 4,
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    letterSpacing: 0.5,
  },
  menuButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    width: 72,
  },
  menuLabel: {
    marginTop: 4,
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    letterSpacing: 0.5,
  },
});
