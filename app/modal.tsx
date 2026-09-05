/**
 * app/modal.tsx — la surface de confirmation générique, passée au système
 * (phase F).
 *
 * ⚠ **Aucun écran n'y renvoie.** C'est le gabarit livré par `create-expo-app`,
 * conservé parce qu'une route modale neutre coûte soixante lignes et se révèle
 * utile le jour où une confirmation n'a pas de meilleur foyer. Si la phase G
 * confirme qu'il ne sert toujours à rien, il part avec
 * `components/modals/SuccessCelebration.tsx` — même arbitrage, même lot.
 */
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GUTTER, Ink, Radius, Space, Surface, Type, Violet, continuous } from "@/theme";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.iconWrap}>
          <CheckCircle2 size={28} color={Violet[700]} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>Action terminée</Text>
        <Text style={styles.text}>
          Cette fenêtre sert de surface de confirmation cohérente avec le reste
          de l&apos;application.
        </Text>

        <Link href="/" dismissTo asChild>
          <Button label="Retour à l’accueil" onPress={() => {}} />
        </Link>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: GUTTER,
    backgroundColor: Surface.alt,
  },
  card: { width: "100%", alignItems: "center", gap: Space.md },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...Type.cardTitle, color: Ink[900] },
  text: { ...Type.body, color: Ink[500], textAlign: "center" },
});
