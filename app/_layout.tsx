// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
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

  /**
   * Plus Jakarta Sans, et elle seule. Les noms sont ceux de `theme/tokens.ts`.
   *
   * Les six graisses d'Inter ont été retirées en phase F, avec le dernier
   * `Inter_` de `app/` : elles pesaient six fichiers de fonte embarqués et
   * quelques centaines de kilo-octets pour un jeu que plus personne ne lisait.
   */
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
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
