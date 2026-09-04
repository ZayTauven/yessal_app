import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Users, Trophy, Target, TrendingUp } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ContentService } from "@/lib/content.service";
import type { CampaignEtat, Contributor } from "@/types/campaign.types";

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

const METHOD_LABELS: Record<string, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  bictorys: "Bictorys",
  virement: "Virement",
  manual: "Manuel",
  paypal: "PayPal",
  collector: "Collecteur",
  visa: "Visa",
  mastercard: "Mastercard",
};

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  orange_money: { bg: "#FFF3E0", text: "#E65100" },
  wave: { bg: "#E3F2FD", text: "#1565C0" },
  bictorys: { bg: "#F3E5F5", text: "#6A1B9A" },
  virement: { bg: "#F5F5F5", text: "#424242" },
  manual: { bg: "#FFFDE7", text: "#F57F17" },
};

function PaymentBadge({ method }: { method: string }) {
  const color = METHOD_COLORS[method] ?? { bg: "#F5F5F5", text: "#424242" };
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.badgeText, { color: color.text }]}>
        {METHOD_LABELS[method] ?? method}
      </Text>
    </View>
  );
}

export default function CampaignEtatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const campaignId = parseId(params.id);

  const [etat, setEtat] = useState<CampaignEtat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    const load = async () => {
      try {
        const data = await ContentService.getCampaignEtat(campaignId);
        setEtat(data);
      } catch (e) {
        console.warn("Failed to load campaign etat", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId]);

  const progress = etat ? Math.min(etat.collected_amount / (etat.goal_amount || 1), 1) : 0;
  const topDonors = etat
    ? [...etat.contributions]
        .filter((c) => !c.is_anonymous)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
    : [];

  const renderContributor = ({ item, index }: { item: Contributor; index: number }) => (
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
            <Text style={styles.contributorDaara} numberOfLines={1}>
              {item.daara_name}
            </Text>
          )}
          <Text style={styles.contributorDate}>
            {new Date(item.date).toLocaleDateString("fr-FR")}
          </Text>
        </View>
      </View>
      <View style={styles.contributorRight}>
        <Text style={styles.amountText}>
          {item.amount.toLocaleString()} F
        </Text>
        <PaymentBadge method={item.payment_method} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "État du Ndiguel",
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
      ) : etat ? (
        <FlatList
          data={etat.contributions}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderContributor}
          contentContainerStyle={styles.scroll}
          ListHeaderComponent={
            <>
              {/* Campaign name + progress */}
              <GlassCard style={styles.summaryCard}>
                <Text style={styles.campaignName}>{etat.ndiguel_name}</Text>
                <ProgressBar
                  progress={progress}
                  label={`${etat.collected_amount.toLocaleString()} / ${etat.goal_amount.toLocaleString()} FCFA`}
                />
              </GlassCard>

              {/* 4 KPI cards */}
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, styles.kpiCardAccent]}>
                  <TrendingUp size={16} color={Colors.accent.DEFAULT} />
                  <Text style={styles.kpiValue}>
                    {etat.collected_amount.toLocaleString()}
                  </Text>
                  <Text style={styles.kpiUnit}>FCFA</Text>
                  <Text style={styles.kpiLabel}>Collecté</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Target size={16} color={Colors.ink.muted} />
                  <Text style={styles.kpiValue}>
                    {etat.goal_amount.toLocaleString()}
                  </Text>
                  <Text style={styles.kpiUnit}>FCFA</Text>
                  <Text style={styles.kpiLabel}>Objectif</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Users size={16} color={Colors.ink.muted} />
                  <Text style={styles.kpiValue}>{etat.donation_count}</Text>
                  <Text style={styles.kpiLabel}>Donateurs</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Trophy size={16} color={Colors.gold.DEFAULT} />
                  <Text style={[styles.kpiValue, { color: Colors.gold.DEFAULT }]}>
                    {etat.progress_pct}%
                  </Text>
                  <Text style={styles.kpiLabel}>Progression</Text>
                </View>
              </View>

              {/* Top 3 donors */}
              {topDonors.length > 0 && (
                <View style={styles.topSection}>
                  <Text style={styles.sectionTitle}>Top contributeurs</Text>
                  <View style={styles.topDonorsList}>
                    {topDonors.map((d, i) => (
                      <View key={i} style={styles.topDonorChip}>
                        <View style={[styles.topDonorAvatar, i === 0 && styles.topDonorAvatarGold]}>
                          <Text style={styles.topDonorAvatarText}>
                            {getInitials(d.member_name || "?")}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.topDonorName} numberOfLines={1}>
                            {d.member_name}
                          </Text>
                          <Text style={styles.topDonorAmount}>
                            {d.amount.toLocaleString()} FCFA
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>
                Liste des contributions ({etat.contributions.length})
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune contribution pour le moment.</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>Impossible de charger les données.</Text>
        </View>
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
    paddingBottom: 40,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  summaryCard: {
    padding: 20,
    marginBottom: 12,
    gap: 16,
  },
  campaignName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  kpiCardAccent: {
    borderColor: Colors.accent.dim,
    backgroundColor: "rgba(26,92,58,0.04)",
  },
  kpiValue: {
    fontSize: 16,
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
    letterSpacing: 0.5,
    textAlign: "center",
  },
  topSection: {
    marginBottom: 20,
  },
  topDonorsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  topDonorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
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
    maxWidth: 100,
  },
  topDonorAmount: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contributorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  contributorBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.DEFAULT,
  },
  contributorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent.dim,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  contributorAvatarText: {
    fontSize: 12,
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
  contributorDaara: {
    fontSize: 11,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  contributorDate: {
    fontSize: 11,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  contributorRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  amountText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    color: Colors.status.error,
    fontFamily: "Inter_500Medium",
  },
});
