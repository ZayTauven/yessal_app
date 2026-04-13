import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Calendar, ArrowRight } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface CampaignCardProps {
  title: string;
  description: string;
  goal: number;
  raised: number;
  daysLeft: number;
  onPress: () => void;
}

export function CampaignCard({ title, description, goal, raised, daysLeft, onPress }: CampaignCardProps) {
  const progress = Math.min(raised / goal, 1);

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.daysTag}>
            <Calendar size={12} color={Colors.ink.muted} />
            <Text style={styles.daysText}>{daysLeft} j. restants</Text>
          </View>
        </View>
        
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <ProgressBar 
          progress={progress} 
          label={`${raised.toLocaleString()} / ${goal.toLocaleString()} FCFA`}
        />

        <View style={styles.footer}>
          <Text style={styles.ctaText}>Participer au Jëf</Text>
          <View style={styles.ctaIcon}>
            <ArrowRight size={16} color="#FFF" />
          </View>
        </View>

      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    flex: 1,
  },
  daysTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 18,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  ctaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
});
