import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, Filter, Heart, Search, Settings2, TrendingUp } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ContentService } from "@/lib/content.service";
import type { Campaign } from "@/types/campaign.types";

const FALLBACK_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    name: "Rénovation de la grande mosquée",
    description: "Soutenez la restauration de notre patrimoine spirituel.",
    goal_amount: 1_500_000,
    collected_amount: 1_080_000,
    deadline: "2024-12-31",
    status: "active",
    created_at: new Date().toISOString(),
    image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: 2,
    name: "Soutien aux étudiants",
    description: "Bourses d'études pour les talibés méritants.",
    goal_amount: 900_000,
    collected_amount: 396_000,
    deadline: "2024-12-31",
    status: "active",
    created_at: new Date().toISOString(),
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: 3,
    name: "Distribution Ramadan",
    description: "Kits alimentaires pour les familles nécessiteuses.",
    goal_amount: 2_000_000,
    collected_amount: 1_820_000,
    deadline: "2024-12-31",
    status: "completed",
    created_at: new Date().toISOString(),
    image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400",
  },
];

function statusLabel(status: Campaign["status"]) {
  switch (status) {
    case "active":
      return "En cours";
    case "completed":
      return "Clôturée";
    case "pending":
      return "En attente";
    default:
      return "Inactive";
  }
}

export default function CampaignsScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(FALLBACK_CAMPAIGNS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await ContentService.getCampaigns();
        if (active && data.length > 0) {
          setCampaigns(data);
        }
      } catch {
        if (active) {
          setCampaigns(FALLBACK_CAMPAIGNS);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const featuredCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "active").slice(0, 3),
    [campaigns],
  );

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Ndiguels"
        subtitle="Suivez les ndiguels en cours et contribuez rapidement"
        icon={<TrendingUp size={24} color="#FFF" />}
        actions={[
          {
            label: "Notifications",
            icon: <Bell size={18} color={Colors.ink.DEFAULT} />,
            onPress: () => router.push("/notifications" as any),
          },
          {
            label: "Paramètres",
            icon: <Settings2 size={18} color={Colors.ink.DEFAULT} />,
            onPress: () => router.push("/profile" as any),
          },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.searchBar}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Rechercher un ndiguel..."
              icon={<Search size={18} color={Colors.ink.faint} />}
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <Filter size={20} color={Colors.accent.DEFAULT} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>En vedette</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredRow}
        >
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
            </View>
          ) : (
            featuredCampaigns.map((campaign) => {
              const progress =
                campaign.goal_amount > 0 ? campaign.collected_amount / campaign.goal_amount : 0;
              return (
                <Pressable
                  key={campaign.id}
                  onPress={() =>
                    router.push(`/campaign/${campaign.id}` as any)
                  }
                >
                  <GlassCard style={styles.featuredCard}>
                    {campaign.image && (
                      <Image 
                        source={{ uri: campaign.image }} 
                        style={styles.featuredImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.featuredContent}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{campaign.name}</Text>
                          <Text style={styles.cardGoal}>
                            {campaign.collected_amount.toLocaleString()} /{" "}
                            {campaign.goal_amount.toLocaleString()} FCFA
                          </Text>
                        </View>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{statusLabel(campaign.status)}</Text>
                        </View>
                      </View>

                      <ProgressBar progress={progress} showPercent={false} />
                      <Text style={styles.featuredHint}>
                        Balayez pour voir plus de ndiguels.
                      </Text>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Tous les ndiguels</Text>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          scrollIndicatorInsets={{ bottom: 220 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {campaigns.map((campaign) => {
            const progress =
              campaign.goal_amount > 0 ? campaign.collected_amount / campaign.goal_amount : 0;
            return (
              <Pressable
                key={campaign.id}
                onPress={() => router.push(`/campaign/${campaign.id}` as any)}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.listCardContent}>
                    {campaign.image && (
                      <Image 
                        source={{ uri: campaign.image }} 
                        style={styles.listImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{campaign.name}</Text>
                          <Text style={styles.cardGoal}>
                            {campaign.collected_amount.toLocaleString()} FCFA collectés
                          </Text>
                        </View>
                        <View style={[styles.badge, { paddingVertical: 4, paddingHorizontal: 8 }]}>
                          <Text style={[styles.badgeText, { fontSize: 10 }]}>{statusLabel(campaign.status)}</Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <ProgressBar progress={progress} showPercent={false} />
                        <Text style={styles.progressLabel}>
                          {Math.round(progress * 100)}% de l&apos;objectif atteint
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          label="Faire un Jëfs"
          onPress={() => router.push("/donate" as any)}
          icon={<Heart size={16} color="#fff" />}
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    flex: 1,
    marginTop: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    zIndex: 2,
  },
  searchBar: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(26, 92, 58, 0.08)",
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  featuredRow: {
    gap: 12,
    paddingBottom: 10,
    paddingLeft: 4,
    paddingRight: 18,
    marginBottom: 24,
  },
  featuredCard: {
    width: 308,
    padding: 0,
    overflow: "hidden",
    borderRadius: 20,
  },
  featuredImage: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.surface.muted,
  },
  featuredContent: {
    padding: 16,
    gap: 10,
  },
  loadingCard: {
    width: 280,
    minHeight: 140,
    borderRadius: 20,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 16,
    marginHorizontal: 4,
  },
  scroll: {
    paddingBottom: 240,
    gap: 16,
  },
  card: {
    padding: 12,
    borderRadius: 18,
  },
  listCardContent: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.surface.muted,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  cardGoal: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.accent.dim,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  featuredHint: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  ctaButton: {
    marginTop: 4,
    marginBottom: 24,
  },
});
