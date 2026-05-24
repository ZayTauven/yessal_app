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
import { Bell, Calendar, Filter, Heart, Search, TrendingUp } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { ContentService } from "@/lib/content.service";
import { useAuthStore } from "@/store/auth.store";
import type { Campaign } from "@/types/campaign.types";

const PRIVILEGED_ROLES = ["admin", "chef_daara", "collector"];

const COVER_ILLUSTRATIONS = [
  require("@/assets/images/arabesque.png"),
  require("@/assets/images/ornement.png"),
  require("@/assets/images/etoile-filante.png"),
  require("@/assets/images/donner-de-lamour.png"),
  require("@/assets/images/lune.png"),
  require("@/assets/images/soleil.png"),
];

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
    image: null,
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
    image: null,
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
    image: null,
  },
];

const STATUS_CONFIG: Record<Campaign["status"], { label: string; color: string }> = {
  active: { label: "En cours", color: Colors.accent.DEFAULT },
  completed: { label: "Clôturée", color: Colors.status?.success ?? "#2D6A4F" },
  pending: { label: "En attente", color: Colors.gold?.DEFAULT ?? "#B8860B" },
  inactive: { label: "Inactive", color: Colors.ink.faint },
};

function daysLeft(deadline?: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  return days > 0 ? days : 0;
}

export default function CampaignsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? "");

  const [campaigns, setCampaigns] = useState<Campaign[]>(FALLBACK_CAMPAIGNS);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Campaign["status"] | "all">("all");
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
    let list = campaigns;
    if (activeFilter !== "all") list = list.filter((c) => c.status === activeFilter);
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q),
    );
  }, [campaigns, search, activeFilter]);

  const filters: Array<{ key: Campaign["status"] | "all"; label: string }> = [
    { key: "all", label: "Tous" },
    { key: "active", label: "En cours" },
    { key: "completed", label: "Clôturés" },
  ];

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
        {/* Search + filter */}
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Rechercher un ndiguel..."
              value={search}
              onChangeText={setSearch}
              icon={<Search size={18} color={Colors.ink.faint} />}
            />
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

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
                const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.inactive;
                const hasGoal = campaign.goal_amount > 0;
                const progress = hasGoal
                  ? Math.min(campaign.collected_amount / campaign.goal_amount, 1)
                  : 0;
                const remaining = daysLeft(campaign.deadline);

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
                          <ExpoImage
                            source={COVER_ILLUSTRATIONS[campaign.id % COVER_ILLUSTRATIONS.length]}
                            style={styles.coverArabesque}
                            contentFit="contain"
                            tintColor={Colors.accent.DEFAULT}
                          />
                        </View>
                      )}

                      <View style={styles.cardBody}>
                        {/* Status badge */}
                        <View style={[styles.badge, { backgroundColor: cfg.color + "18", borderColor: cfg.color + "30" }]}>
                          <Text style={[styles.badgeText, { color: cfg.color }]}>
                            {cfg.label}
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

                        {/* Deadline */}
                        {remaining !== null && campaign.status === "active" && (
                          <View style={styles.deadlineRow}>
                            <Calendar size={10} color={Colors.ink.faint} />
                            <Text style={styles.deadlineText}>
                              {remaining > 0 ? `${remaining}j restants` : "Dernier jour"}
                            </Text>
                          </View>
                        )}

                        {/* Progress — visible only pour rôles privilégiés */}
                        {isPrivileged && hasGoal && (
                          <View style={styles.progressWrap}>
                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.progressFill,
                                  { width: `${Math.max(progress * 100, 4)}%` },
                                  progress >= 0.9 && styles.progressFillHigh,
                                ]}
                              />
                            </View>
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

                        {/* Privilégié + sans objectif fixe */}
                        {isPrivileged && !hasGoal && campaign.collected_amount > 0 && (
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
          label="Faire un Jëf"
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
    paddingTop: 14,
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  filterRow: {
    gap: 8,
    marginBottom: 14,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  filterChipActive: {
    backgroundColor: Colors.accent.DEFAULT,
    borderColor: Colors.accent.DEFAULT,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  filterChipTextActive: {
    color: "#FFF",
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
    height: 120,
    backgroundColor: Colors.surface.muted,
  },
  coverPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverArabesque: {
    width: 100,
    height: 100,
    opacity: 0.25,
  },
  cardBody: {
    padding: 12,
    gap: 5,
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
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  deadlineText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.faint,
  },
  progressWrap: {
    marginTop: 6,
    gap: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.surface.muted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.accent.DEFAULT,
  },
  progressFillHigh: {
    backgroundColor: Colors.gold?.DEFAULT ?? "#B8860B",
  },
  amountsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  collectedAmt: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  goalAmt: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  collectedNoGoal: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
    marginTop: 2,
  },
  ctaButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});
