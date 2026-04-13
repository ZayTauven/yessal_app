import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { ArrowLeft, CalendarDays, Heart, Share2, Users, Clock, CreditCard } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ContentService } from "@/lib/content.service";
import type { Campaign } from "@/types/campaign.types";

function parseId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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

function formatDeadline(date?: string | null) {
  if (!date) {
    return "Date à venir";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function CampaignDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const campaignId = parseId(params.id);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await ContentService.getCampaigns();
        if (active) {
          setCampaigns(data);
        }
      } catch {
        if (active) {
          setCampaigns([]);
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

  const campaign = useMemo(
    () => campaigns.find((item) => item.id === campaignId) ?? null,
    [campaignId, campaigns],
  );

  const progress = useMemo(() => {
    if (!campaign || campaign.goal_amount <= 0) {
      return 0;
    }
    return Math.min(campaign.collected_amount / campaign.goal_amount, 1);
  }, [campaign]);

  const handleDonate = () => {
    if (!campaign) {
      router.push("/donate" as any);
      return;
    }

    router.push({
      pathname: "/donate",
      params: { campaignId: String(campaign.id) },
    } as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerBg} />
        <View style={styles.headerBlobLeft} />
        <View style={styles.headerBlobRight} />
        <View style={styles.headerOverlay} />

        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={22} color={Colors.ink.DEFAULT} />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable style={styles.iconBtn}>
              <Share2 size={22} color={Colors.ink.DEFAULT} />
            </Pressable>
          </View>
        </View>

        <View style={styles.headerContent}>
          <View style={styles.heroBadge}>
            <CalendarDays size={14} color={Colors.accent.DEFAULT} />
            <Text style={styles.heroBadgeText}>
              {campaign ? statusLabel(campaign.status) : "Campagne"}
            </Text>
          </View>
          <Text style={styles.title}>{campaign?.name ?? "Chargement de la campagne..."}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={16} color={Colors.accent.DEFAULT} />
              <Text style={styles.statText}>
                {campaign?.collected_amount ? `${Math.round(progress * 100)}% collectés` : "Données en cours"}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={16} color={Colors.accent.DEFAULT} />
              <Text style={styles.statText}>{formatDeadline(campaign?.deadline)}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: 180 }}
        contentContainerStyle={styles.scroll}
      >
        {loading ? (
          <GlassCard style={styles.loadingCard}>
            <ActivityIndicator color={Colors.accent.DEFAULT} />
          </GlassCard>
        ) : null}

        {!loading && campaign ? (
          <>
            <GlassCard style={styles.infoCard}>
              <ProgressBar
                progress={progress}
                label={`${campaign.collected_amount.toLocaleString()} / ${campaign.goal_amount.toLocaleString()} FCFA`}
              />
              <View style={styles.metaInfo}>
                <Text style={styles.metaLabel}>Objectif</Text>
                <Text style={styles.metaValue}>{campaign.goal_amount.toLocaleString()} FCFA</Text>
              </View>
            </GlassCard>

            {(campaign.event_name || campaign.daara_name) && (
              <GlassCard style={styles.linkedCard}>
                <Text style={styles.sectionTitle}>Rattachement</Text>
                {campaign.event_name ? (
                  <View style={styles.linkedRow}>
                    <View style={styles.linkedPill}>
                      <Text style={styles.linkedPillLabel}>Événement lié</Text>
                    </View>
                    <Text style={styles.linkedValue}>{campaign.event_name}</Text>
                  </View>
                ) : null}
                {campaign.daara_name ? (
                  <View style={styles.linkedRow}>
                    <View style={styles.linkedPill}>
                      <Text style={styles.linkedPillLabel}>Daara</Text>
                    </View>
                    <Text style={styles.linkedValue}>{campaign.daara_name}</Text>
                  </View>
                ) : null}
              </GlassCard>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos de ce Jëf</Text>
              <Text style={styles.description}>
                {campaign.description ||
                  "Cette campagne suit les données publiées par le backend et permet de contribuer directement depuis le mobile."}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Résumé</Text>
              <View style={styles.resumeGrid}>
                <GlassCard style={styles.resumeCard}>
                  <Text style={styles.resumeLabel}>Statut</Text>
                  <Text style={styles.resumeValue}>{statusLabel(campaign.status)}</Text>
                </GlassCard>
                <GlassCard style={styles.resumeCard}>
                  <Text style={styles.resumeLabel}>Date limite</Text>
                  <Text style={styles.resumeValue}>{formatDeadline(campaign.deadline)}</Text>
                </GlassCard>
                <GlassCard style={styles.resumeCard}>
                  <Text style={styles.resumeLabel}>Collecté</Text>
                  <Text style={styles.resumeValue}>{campaign.collected_amount.toLocaleString()} FCFA</Text>
                </GlassCard>
                <GlassCard style={styles.resumeCard}>
                  <Text style={styles.resumeLabel}>Objectif</Text>
                  <Text style={styles.resumeValue}>{campaign.goal_amount.toLocaleString()} FCFA</Text>
                </GlassCard>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Moyens de paiement</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paymentScroll}
              >
                <View style={styles.paymentItem}>
                  <View style={styles.paymentLogo}>
                    <CreditCard size={24} color={Colors.accent.DEFAULT} />
                  </View>
                  <Text style={styles.paymentName}>Orange Money</Text>
                </View>
                <View style={styles.paymentItem}>
                  <View style={styles.paymentLogo}>
                    <CreditCard size={24} color={Colors.accent.DEFAULT} />
                  </View>
                  <Text style={styles.paymentName}>Wave</Text>
                </View>
                <View style={styles.paymentItem}>
                  <View style={styles.paymentLogo}>
                    <CreditCard size={24} color={Colors.accent.DEFAULT} />
                  </View>
                  <Text style={styles.paymentName}>Carte bancaire</Text>
                </View>
                <View style={styles.paymentItem}>
                  <View style={styles.paymentLogo}>
                    <CreditCard size={24} color={Colors.accent.DEFAULT} />
                  </View>
                  <Text style={styles.paymentName}>PayPal</Text>
                </View>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Illustration</Text>
              <GlassCard style={styles.imageCard}>
                <ExpoImage
                  source={require("@/assets/images/placeholder-logo.png")}
                  style={styles.campaignImage}
                  contentFit="contain"
                />
              </GlassCard>
            </View>
          </>
        ) : null}

        {!loading && !campaign ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Campagne introuvable</Text>
            <Text style={styles.emptyText}>
              Cette campagne n’est plus disponible ou l’identifiant est invalide.
            </Text>
          </GlassCard>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Participer Fi Sabillah"
          onPress={handleDonate}
          icon={<Heart size={20} color="#FFF" />}
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
  header: {
    height: 300,
    justifyContent: "flex-end",
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FAF8F3",
  },
  headerBlobLeft: {
    position: "absolute",
    top: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.accent.dim,
    opacity: 0.6,
  },
  headerBlobRight: {
    position: "absolute",
    top: 10,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(184, 134, 11, 0.08)",
    opacity: 0.8,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  topBar: {
    position: "absolute",
    top: 60,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  topActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerContent: {
    gap: 12,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  heroBadgeText: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  scroll: {
    padding: 24,
    paddingBottom: 120,
    paddingTop: 16,
  },
  loadingCard: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  infoCard: {
    marginTop: -24,
    marginBottom: 28,
    padding: 20,
  },
  linkedCard: {
    marginBottom: 28,
    padding: 18,
    gap: 12,
  },
  metaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  metaValue: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  linkedRow: {
    gap: 6,
  },
  linkedPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.accent.dim,
  },
  linkedPillLabel: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  linkedValue: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
  resumeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  resumeCard: {
    width: "48%",
    padding: 14,
  },
  resumeLabel: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  resumeValue: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  paymentScroll: {
    gap: 12,
    paddingRight: 24,
  },
  paymentItem: {
    width: 110,
    height: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  paymentLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  imageCard: {
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  campaignImage: {
    width: 120,
    height: 120,
  },
  emptyCard: {
    padding: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
});
