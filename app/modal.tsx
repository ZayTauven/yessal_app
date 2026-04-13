import { Link } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <GlassCard style={styles.card}>
        <View style={styles.iconWrap}>
          <CheckCircle2 size={28} color={Colors.accent.DEFAULT} />
        </View>
        <Text style={styles.title}>Action terminée</Text>
        <Text style={styles.text}>
          Cette fenêtre sert de surface de confirmation cohérente avec le reste
          de l’application.
        </Text>

        <Link href="/" dismissTo asChild>
          <Button label="Retour à l’accueil" onPress={() => {}} />
        </Link>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: Colors.surface.subtle,
  },
  card: {
    width: "100%",
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
});
