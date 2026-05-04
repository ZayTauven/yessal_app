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
import { ArrowLeft, Users, Trophy, UserCheck } from "lucide-react-native";

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

  const progress = etat ? Math.min(etat.collected_amount / etat.goal_amount, 1) : 0;

  const renderContributor = ({ item }: { item: Contributor }) => (
    <GlassCard style={styles.contributorCard}>
      <View style={styles.contributorRow}>
        <View style={styles.contributorAvatar}>
          <UserCheck size={20} color={Colors.accent.DEFAULT} />
        </View>
        <View style={styles.contributorInfo}>
          <Text style={styles.contributorName}>
            {item.is_anonymous ? "Donateur Anonyme" : item.member_name}
          </Text>
          <Text style={styles.contributorDate}>
            {new Date(item.date).toLocaleDateString("fr-FR")}
          </Text>
        </View>
        <View style={styles.contributorAmount}>
          <Text style={styles.amountText}>
            {item.amount.toLocaleString()} FCFA
          </Text>
        </View>
      </View>
    </GlassCard>
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
              <GlassCard style={styles.summaryCard}>
                <Text style={styles.campaignName}>{etat.ndiguel_name}</Text>
                <ProgressBar
                  progress={progress}
                  label={`${etat.collected_amount.toLocaleString()} / ${etat.goal_amount.toLocaleString()} FCFA`}
                />
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Trophy size={16} color={Colors.accent.DEFAULT} />
                    <Text style={styles.statText}>
                      {etat.progress_pct}% de l&apos;objectif
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Users size={16} color={Colors.accent.DEFAULT} />
                    <Text style={styles.statText}>
                      {etat.donation_count} contributeurs
                    </Text>
                  </View>
                </View>
              </GlassCard>
              <Text style={styles.sectionTitle}>Liste des contributions</Text>
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
    marginBottom: 24,
  },
  campaignName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_600SemiBold",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 16,
  },
  contributorCard: {
    padding: 14,
    marginBottom: 12,
  },
  contributorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contributorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent.dim,
    justifyContent: "center",
    alignItems: "center",
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
  },
  contributorDate: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  contributorAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
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
