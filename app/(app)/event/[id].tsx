import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ContentService } from "@/lib/content.service";
import type { Contributor, FeteCampaign, FeteEtat } from "@/types/campaign.types";

function parseId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "Actif", bg: "#E8F5E9", text: "#2D6A4F" },
  pending: { label: "En attente", bg: "#FFFDE7", text: "#F57F17" },
  completed: { label: "Terminé", bg: "#F5F5F5", text: "#424242" },
  inactive: { label: "Inactif", bg: "#FFEBEE", text: "#8B2E2E" },
};

const METHOD_LABELS: Record<string, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  bictorys: "Bictorys",
  virement: "Virement",
  manual: "Manuel",
  paypal: "PayPal",
  collector: "Collecteur",
};

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  orange_money: { bg: "#FFF3E0", text: "#E65100" },
  wave: { bg: "#E3F2FD", text: "#1565C0" },
  bictorys: { bg: "#F3E5F5", text: "#6A1B9A" },
  virement: { bg: "#F5F5F5", text: "#424242" },
  manual: { bg: "#FFFDE7", text: "#F57F17" },
};

function CampaignRow({ item, onPress }: { item: FeteCampaign; onPress: () => void }) {
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const goal = item.goal_amount ?? 0;
  const progress = goal > 0 ? Math.min(item.collected_amount / goal, 1) : 0;

  return (
    <Pressable style={styles.campaignRow} onPress={onPress}>
      <View style={styles.campaignRowHeader}>
        <View style={styles.campaignRowLeft}>
          <Text style={styles.campaignRowName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.campaignRowMeta}>
            {item.daara_name && (
              <Text style={styles.campaignMeta}>{item.daara_name}</Text>
            )}
            <Text style={styles.campaignMeta}>
              {new Date(item.deadline).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          {goal > 0 && (
            <View style={styles.campaignProgress}>
              <ProgressBar
                progress={progress}
                label={`${item.progress_pct}%`}
              />
            </View>
          )}
        </View>
        <View style={styles.campaignRowRight}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
          <Text style={styles.campaignAmount}>
            {item.collected_amount.toLocaleString()}
          </Text>
          <Text style={styles.campaignAmountUnit}>FCFA</Text>
          {goal > 0 && (
            <Text style={styles.campaignGoal}>/ {goal.toLocaleString()}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ContributorRow({
  item,
  index,
}: {
  item: Contributor;
  index: number;
}) {
  const methodColor = METHOD_COLORS[item.payment_method] ?? {
    bg: "#F5F5F5",
    text: "#424242",
  };
  return (
    <View style={[styles.contributorRow, index > 0 && styles.contributorBorder]}>
      <View style={styles.contributorAvatar}>
        <Text style={styles.contributorAvatarText}>
          {item.is_anonymous ? "?" : getInitials(item.member_name || "?")}
        </Text>
      </View>
      <View style={styles.contributorInfo}>
        <Text style={styles.contributorName} numberOfLines={1}>
          {item.is_anonymous ? "Donateur Anonyme" : item.member_name}
        </Text>
        <View style={styles.contributorMeta}>
          {item.daara_name && (
            <Text style={styles.contributorDetail}>{item.daara_name}</Text>
          )}
          {item.campaign_name && (
            <Text style={styles.contributorDetail}>{item.campaign_name}</Text>
          )}
          <Text style={styles.contributorDate}>
            {new Date(item.date).toLocaleDateString("fr-FR")}
          </Text>
        </View>
      </View>
      <View style={styles.contributorRight}>
        <Text style={styles.contributorAmount}>
          {item.amount.toLocaleString()} F
        </Text>
        <View style={[styles.methodBadge, { backgroundColor: methodColor.bg }]}>
          <Text style={[styles.methodText, { color: methodColor.text }]}>
            {METHOD_LABELS[item.payment_method] ?? item.payment_method}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function FeteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const feteId = parseId(params.id);

  const [etat, setEtat] = useState<FeteEtat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!feteId) return;
    const load = async () => {
      try {
        const data = await ContentService.getFeteEtat(feteId);
        setEtat(data);
      } catch (e) {
        console.warn("Failed to load fete etat", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [feteId]);

  const topDonors = etat
    ? [...etat.contributions]
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 3)
    : [];

  const totalCollected = etat ? Number(etat.total_collected) : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: etat?.name ?? "Détail Fête",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={Colors.ink.DEFAULT} />
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent.DEFAULT} size="large" />
        </View>
      ) : !etat ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Impossible de charger les données.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.feteName}>{etat.name}</Text>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: etat.is_active ? "#E8F5E9" : "#FFEBEE" },
                ]}
              >
                <Text
                  style={[
                    styles.activeBadgeText,
                    { color: etat.is_active ? "#2D6A4F" : "#8B2E2E" },
                  ]}
                >
                  {etat.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            {etat.description ? (
              <Text style={styles.feteDescription}>{etat.description}</Text>
            ) : null}
            {etat.date && (
              <View style={styles.dateRow}>
                <Calendar size={13} color={Colors.ink.muted} />
                <Text style={styles.dateText}>
                  {new Date(etat.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, styles.kpiCardAccent]}>
              <TrendingUp size={16} color={Colors.accent.DEFAULT} />
              <Text style={[styles.kpiValue, { color: Colors.accent.DEFAULT }]}>
                {totalCollected.toLocaleString()}
              </Text>
              <Text style={styles.kpiUnit}>FCFA</Text>
              <Text style={styles.kpiLabel}>Collecté</Text>
            </View>
            <View style={styles.kpiCard}>
              <Users size={16} color={Colors.ink.muted} />
              <Text style={styles.kpiValue}>{etat.donation_count}</Text>
              <Text style={styles.kpiLabel}>Donateurs</Text>
            </View>
            <View style={styles.kpiCard}>
              <BookOpen size={16} color={Colors.ink.muted} />
              <Text style={styles.kpiValue}>{etat.campaigns_count}</Text>
              <Text style={styles.kpiLabel}>Ndiguels</Text>
            </View>
          </View>

          {/* Top donors */}
          {topDonors.length > 0 && (
            <GlassCard style={styles.topSection}>
              <Text style={styles.sectionTitle}>Top contributeurs</Text>
              <View style={styles.topDonorsList}>
                {topDonors.map((d, i) => (
                  <View key={i} style={styles.topDonorChip}>
                    <View
                      style={[
                        styles.topDonorAvatar,
                        i === 0 && styles.topDonorAvatarGold,
                      ]}
                    >
                      <Text style={styles.topDonorAvatarText}>
                        {d.is_anonymous
                          ? "?"
                          : getInitials(d.member_name || "?")}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.topDonorName} numberOfLines={1}>
                        {d.is_anonymous ? "Anonyme" : d.member_name}
                      </Text>
                      <Text style={styles.topDonorAmount}>
                        {Number(d.amount).toLocaleString()} FCFA
                      </Text>
                      {d.campaign_name && (
                        <Text style={styles.topDonorCampaign} numberOfLines={1}>
                          {d.campaign_name}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          {/* Ndiguels list */}
          {etat.campaigns.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Ndiguels associés ({etat.campaigns.length})
              </Text>
              <GlassCard style={styles.listCard}>
                {etat.campaigns.map((c, i) => (
                  <CampaignRow
                    key={c.id}
                    item={c}
                    onPress={() =>
                      router.push(`/campaign/etat-${c.id}` as any)
                    }
                  />
                ))}
              </GlassCard>
            </View>
          )}

          {/* Contributions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Contributions ({etat.contributions.length})
            </Text>
            {etat.contributions.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Aucune contribution confirmée.
                </Text>
              </GlassCard>
            ) : (
              <GlassCard style={styles.listCard}>
                {etat.contributions.map((c, i) => (
                  <ContributorRow key={i} item={c} index={i} />
                ))}
              </GlassCard>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  header: {
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  feteName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  feteDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  kpiCardAccent: {
    borderColor: "rgba(26,92,58,0.2)",
    backgroundColor: "rgba(26,92,58,0.04)",
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginTop: 4,
  },
  kpiUnit: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    marginTop: -4,
  },
  kpiLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  topSection: {
    padding: 16,
    gap: 12,
  },
  topDonorsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topDonorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface.muted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topDonorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accent.dim,
    justifyContent: "center",
    alignItems: "center",
  },
  topDonorAvatarGold: {
    backgroundColor: "rgba(184,134,11,0.15)",
  },
  topDonorAvatarText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  topDonorName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
    maxWidth: 110,
  },
  topDonorAmount: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  topDonorCampaign: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
    maxWidth: 110,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
  },
  campaignRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
  },
  campaignRowHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  campaignRowLeft: {
    flex: 1,
    gap: 4,
  },
  campaignRowName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent.DEFAULT,
    lineHeight: 20,
  },
  campaignRowMeta: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  campaignMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  campaignProgress: {
    marginTop: 6,
  },
  campaignRowRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  campaignAmount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  campaignAmountUnit: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
    marginTop: -4,
  },
  campaignGoal: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  contributorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contributorBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.DEFAULT,
  },
  contributorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent.dim,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  contributorAvatarText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  contributorInfo: {
    flex: 1,
    minWidth: 0,
  },
  contributorName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
  },
  contributorMeta: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  contributorDetail: {
    fontSize: 10,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  contributorDate: {
    fontSize: 10,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  contributorRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  contributorAmount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  methodText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
    fontStyle: "italic",
  },
  errorText: {
    color: Colors.status.error,
    fontFamily: "Inter_500Medium",
  },
});
