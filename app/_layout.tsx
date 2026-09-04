// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { hydrate } = useAuthStore();

  const [fontsLoaded] = useFonts({
    // Plus Jakarta Sans — la police du kit. Les noms sont ceux de `theme/tokens.ts`.
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    // Inter — l'ancien jeu. Les écrans non encore migrés (phases D à F) le lisent
    // encore. À retirer quand plus aucun `Inter_` ne subsiste dans `app/`.
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });

  useEffect(() => {
    async function init() {
      await hydrate();
      if (fontsLoaded) await SplashScreen.hideAsync();
    }
    init();
  }, [fontsLoaded, hydrate]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </SafeAreaProvider>
  );
}
