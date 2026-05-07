import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { Bell, Filter, Heart, Search, TrendingUp } from "lucide-react-native";

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
    goal_amount: 0,
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
    case "active": return "En cours";
    case "completed": return "Clôturée";
    case "pending": return "En attente";
    default: return "Inactive";
  }
}

function statusColor(status: Campaign["status"]) {
  switch (status) {
    case "active": return Colors.accent.DEFAULT;
    case "completed": return Colors.status?.success ?? "#22C55E";
    default: return Colors.ink.faint;
  }
}

export default function CampaignsScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(FALLBACK_CAMPAIGNS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await ContentService.getCampaigns();
        if (active && data.length > 0) setCampaigns(data);
      } catch {
        if (active) setCampaigns(FALLBACK_CAMPAIGNS);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return campaigns;
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Ndiguels"
        subtitle="Consultez et contribuez aux ndiguels actifs"
        icon={<TrendingUp size={24} color="#FFF" />}
        actions={[
          {
            label: "Notifications",
            icon: <Bell size={18} color={Colors.ink.DEFAULT} />,
            onPress: () => router.push("/notifications" as any),
          },
        ]}
      />

      <View style={styles.content}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Rechercher un ndiguel..."
              value={search}
              onChangeText={setSearch}
              icon={<Search size={18} color={Colors.ink.faint} />}
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <Filter size={20} color={Colors.accent.DEFAULT} />
          </Pressable>
        </View>

        {/* Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.accent.DEFAULT} size="large" />
              <Text style={styles.loadingText}>Chargement des ndiguels…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Heart size={48} color={Colors.ink.faint} />
              <Text style={styles.emptyText}>Aucun ndiguel trouvé.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((campaign) => {
                const hasGoal = campaign.goal_amount > 0;
                const progress = hasGoal
                  ? Math.min(campaign.collected_amount / campaign.goal_amount, 1)
                  : 0;
                const color = statusColor(campaign.status);

                return (
                  <Pressable
                    key={campaign.id}
                    style={styles.gridCell}
                    onPress={() => router.push(`/campaign/${campaign.id}` as any)}
                  >
                    <GlassCard style={styles.card}>
                      {/* Cover image */}
                      {campaign.image ? (
                        <ExpoImage
                          source={{ uri: campaign.image }}
                          style={styles.coverImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.coverPlaceholder}>
                          <Heart size={28} color={Colors.accent.DEFAULT} />
                        </View>
                      )}

                      <View style={styles.cardBody}>
                        {/* Status badge */}
                        <View style={[styles.badge, { backgroundColor: color + "18", borderColor: color + "30" }]}>
                          <Text style={[styles.badgeText, { color }]}>
                            {statusLabel(campaign.status)}
                          </Text>
                        </View>

                        {/* Title */}
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {campaign.name}
                        </Text>

                        {/* Description */}
                        {campaign.description ? (
                          <Text style={styles.cardDesc} numberOfLines={2}>
                            {campaign.description}
                          </Text>
                        ) : null}

                        {/* Progress (only when financial goal exists) */}
                        {hasGoal && (
                          <View style={styles.progressWrap}>
                            <ProgressBar progress={progress} showPercent={false} />
                            <View style={styles.amountsRow}>
                              <Text style={styles.collectedAmt}>
                                {campaign.collected_amount.toLocaleString("fr-FR")} FCFA
                              </Text>
                              <Text style={styles.goalAmt}>
                                / {campaign.goal_amount.toLocaleString("fr-FR")}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* No goal: just show collected */}
                        {!hasGoal && campaign.collected_amount > 0 && (
                          <Text style={styles.collectedNoGoal}>
                            {campaign.collected_amount.toLocaleString("fr-FR")} FCFA collectés
                          </Text>
                        )}
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })}
            </View>
          )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
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
  scroll: {
    paddingBottom: 220,
  },
  loadingWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  emptyWrap: {
    paddingTop: 80,
    alignItems: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCell: {
    width: "47.5%",
  },
  card: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 20,
    flex: 1,
  },
  coverImage: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.surface.muted,
  },
  coverPlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 12,
    gap: 6,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    lineHeight: 18,
  },
  cardDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 15,
  },
  progressWrap: {
    marginTop: 4,
    gap: 4,
  },
  amountsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  collectedAmt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  goalAmt: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  collectedNoGoal: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
    marginTop: 4,
  },
  ctaButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});
