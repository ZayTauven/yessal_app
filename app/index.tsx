import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent.DEFAULT} size="large" />
      </View>
    );
  }

  if (isAuthenticated) return <Redirect href={"/home" as any} />;
  return <Redirect href={"/onboarding" as any} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface.subtle,
  },
});
