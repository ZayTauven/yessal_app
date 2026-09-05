/**
 * app/(auth)/contact.tsx — le support, passé au système (phase F).
 *
 * Écran hérité : aucune maquette ne le dessine, il reçoit donc les tokens et
 * les composants sans être repensé (§5.2). Ce qui change : `SectionHeader`
 * — 174 px, deux blobs verts et Inter — devient `ScreenHeader`, et `GlassCard`
 * devient `Card`.
 *
 * ⚠ Les trois canaux sont écrits en dur, comme avant. Le backend n'expose
 * aucun point de contact ; les inventer ici serait déjà mieux que de les
 * inventer ailleurs, mais ils restent à confirmer par le commanditaire avant
 * mise en production.
 */
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, MessageCircle, PhoneCall } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  Border,
  GUTTER,
  Ink,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

interface SupportChannel {
  icon: React.ReactNode;
  title: string;
  detail: string;
  /** `undefined` : la ligne s'affiche sans être pressable. */
  href?: string;
}

const CHANNELS: SupportChannel[] = [
  {
    icon: <Mail size={18} color={Violet[700]} strokeWidth={1.5} />,
    title: "Écrire au support",
    detail: "support@yessalgui.com",
    href: "mailto:support@yessalgui.com",
  },
  {
    icon: <PhoneCall size={18} color={Violet[700]} strokeWidth={1.5} />,
    title: "Appeler le support",
    detail: "+221 77 000 00 00",
    href: "tel:+221770000000",
  },
  {
    icon: <MessageCircle size={18} color={Violet[700]} strokeWidth={1.5} />,
    title: "Heures d'ouverture",
    detail: "Du lundi au samedi, de 9 h à 18 h",
  },
];

export default function ContactScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader title="Support" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Choisissez le canal le plus adapté à votre besoin. Un membre de
          l&apos;équipe vous répond pendant les heures ouvrées.
        </Text>

        <Card padded={false} style={styles.card}>
          {CHANNELS.map((channel, index) => (
            <Row
              key={channel.title}
              channel={channel}
              divided={index > 0}
            />
          ))}
        </Card>

        <Button
          label="Retour à la connexion"
          variant="secondary"
          onPress={() => router.replace("/login")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ channel, divided }: { channel: SupportChannel; divided: boolean }) {
  const inner = (
    <>
      <View style={styles.rowIcon}>{channel.icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{channel.title}</Text>
        <Text style={styles.rowDetail}>{channel.detail}</Text>
      </View>
    </>
  );

  if (!channel.href) {
    return <View style={[styles.row, divided && styles.divided]}>{inner}</View>;
  }

  const href = channel.href;

  return (
    <Pressable
      onPress={() => Linking.openURL(href)}
      accessibilityRole="link"
      accessibilityLabel={`${channel.title} — ${channel.detail}`}
      style={({ pressed }) => [
        styles.row,
        divided && styles.divided,
        pressed && styles.pressed,
      ]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: Space.xxxl,
    gap: Space.xl,
  },
  lead: { ...Type.body, color: Ink[500] },
  card: { paddingHorizontal: Space.xl, paddingVertical: Space.xs },
  pressed: { opacity: 0.72 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.lg,
    paddingVertical: Space.lg,
  },
  divided: { borderTopWidth: 1, borderTopColor: Border.hairline },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.input,
    ...continuous,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Violet[100],
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...UIType.rowTitle, color: Ink[900] },
  rowDetail: { ...Type.body, color: Ink[500] },
});
