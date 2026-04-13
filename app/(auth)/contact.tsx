import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, PhoneCall, MessageCircle, ArrowLeft } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

const supportOptions = [
  {
    icon: Mail,
    title: "Email support",
    detail: "support@yessalgui.com",
  },
  {
    icon: PhoneCall,
    title: "Support téléphonique",
    detail: "+221 77 000 00 00",
  },
  {
    icon: MessageCircle,
    title: "Chat communauté",
    detail: "Réponse pendant les heures ouvrées",
  },
];

export default function ContactScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <SectionHeader
        title="Support"
        subtitle="Choisissez le canal le plus adapté à votre besoin"
        icon={<MessageCircle size={24} color="#FFF" />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ArrowLeft size={18} color={Colors.ink.muted} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <GlassCard style={styles.card}>
          {supportOptions.map((item) => {
            const Icon = item.icon;
            return (
              <View key={item.title} style={styles.option}>
                <View style={styles.optionIcon}>
                  <Icon size={18} color={Colors.accent.DEFAULT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionDetail}>{item.detail}</Text>
                </View>
              </View>
            );
          })}
        </GlassCard>

        <Button label="Retour à la connexion" onPress={() => router.replace("/login" as any)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    marginTop: -18,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: Colors.ink.muted,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    padding: 18,
    gap: 16,
    marginBottom: 18,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent.dim,
  },
  optionTitle: {
    color: Colors.ink.DEFAULT,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  optionDetail: {
    color: Colors.ink.muted,
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
});
