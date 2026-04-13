import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/colors";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-subtle">
        <ActivityIndicator color={Colors.accent.DEFAULT} size="large" />
      </View>
    );
  }

  if (isAuthenticated) return <Redirect href={"/home" as any} />;
  return <Redirect href={"/onboarding" as any} />;
}
