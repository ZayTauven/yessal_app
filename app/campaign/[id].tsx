import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { ArrowLeft, CalendarDays, Heart, Share2, Users, Clock } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ContentService } from "@/lib/content.service";
import { useAuthStore } from "@/store/auth.store";
import type { Campaign } from "@/types/campaign.types";

const PRIVILEGED_ROLES = ["admin", "chef_daara", "collector"];

const PAYMENT_LOGOS: Record<string, any> = {
  orange_money: require("@/assets/images/orange money.png"),
  wave: require("@/assets/images/sans-contact.png"),
  paypal: require("@/assets/images/pay-pal.png"),
};

const PAYMENT_METHODS = [
  { key: "orange_money", label: "Orange Money" },
  { key: "wave", label: "Wave" },
  { key: "visa", label: "Carte Visa" },
  { key: "mastercard", label: "Mastercard" },
  { key: "paypal", label: "PayPal" },
  { key: "collector", label: "Collecteur" },
  { key: "virement", label: "Virement" },
];

function parseId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
    case "completed": return Colors.status?.success ?? "#2D6A4F";
    case "pending": return Colors.gold?.DEFAULT ?? "#B8860B";
    default: return Colors.ink.faint;
  }
}

function formatDeadline(date?: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CampaignDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const campaignId = parseId(params.id);
  const { user } = useAuthStore();
  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? "");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) { setLoading(false); return; }
    let active = true;
    const load = async () => {
      try {
        const data = await ContentService.getCampaignById(campaignId);
        if (active) setCampaign(data);
      } catch {
        if (active) setCampaign(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [campaignId]);

  const hasGoal = (campaign?.goal_amount ?? 0) > 0;
  const progress = campaign && hasGoal
    ? Math.min(campaign.collected_amount / campaign.goal_amount, 1)
    : 0;
  const color = campaign ? statusColor(campaign.status) : Colors.accent.DEFAULT;
  const deadline = formatDeadline(campaign?.deadline);

  const handleDonate = () => {
    router.push(campaign
      ? { pathname: "/donate", params: { campaignId: String(campaign.id) } } as any
      : "/donate" as any
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Hero header ─── */}
      <View style={styles.header}>
        {campaign?.image ? (
          <>
            <ExpoImage
              source={{ uri: campaign.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <View style={styles.heroOverlay} />
          </>
        ) : (
          <>
            <View style={styles.headerBg} />
            <View style={styles.headerBlobLeft} />
            <View style={styles.headerBlobRight} />
            <ExpoImage
              source={require("@/assets/images/arabesque.png")}
              style={styles.headerArabesque}
              contentFit="contain"
              tintColor={Colors.accent.DEFAULT}
            />
          </>
        )}

        <View style={[styles.topBar, campaign?.image && styles.topBarOnImage]}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, campaign?.image && styles.iconBtnDark]}>
            <ArrowLeft size={22} color={campaign?.image ? "#FFF" : Colors.ink.DEFAULT} />
          </Pressable>
          <Pressable style={[styles.iconBtn, campaign?.image && styles.iconBtnDark]}>
            <Share2 size={22} color={campaign?.image ? "#FFF" : Colors.ink.DEFAULT} />
          </Pressable>
        </View>

        <View style={styles.headerContent}>
          {campaign ? (
            <View style={[styles.heroBadge, { borderColor: color + "40", backgroundColor: campaign?.image ? "rgba(0,0,0,0.4)" : Colors.surface.DEFAULT }]}>
              <CalendarDays size={13} color={campaign?.image ? "#FFF" : color} />
              <Text style={[styles.heroBadgeText, { color: campaign?.image ? "#FFF" : color }]}>
                {statusLabel(campaign.status)}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.title, campaign?.image && styles.titleOnImage]}>
            {campaign?.name ?? "Chargement…"}
          </Text>
          {deadline ? (
            <View style={styles.statsRow}>
              <Clock size={15} color={campaign?.image ? "rgba(255,255,255,0.85)" : Colors.ink.muted} />
              <Text style={[styles.statText, campaign?.image && styles.statTextOnImage]}>
                Jusqu'au {deadline}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ─── Content ─── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {loading ? (
          <GlassCard style={styles.loadingCard}>
            <ActivityIndicator color={Colors.accent.DEFAULT} />
          </GlassCard>
        ) : null}

        {!loading && campaign ? (
          <>
            {/* Progress card — privilégiés uniquement */}
            {isPrivileged && (
              <GlassCard style={styles.infoCard}>
                {hasGoal ? (
                  <>
                    <ProgressBar
                      progress={progress}
                      label={`${campaign.collected_amount.toLocaleString("fr-FR")} / ${campaign.goal_amount.toLocaleString("fr-FR")} FCFA`}
                    />
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Collecté</Text>
                        <Text style={[styles.metaValue, { color: Colors.accent.DEFAULT }]}>
                          {campaign.collected_amount.toLocaleString("fr-FR")} FCFA
                        </Text>
                      </View>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Objectif</Text>
                        <Text style={styles.metaValue}>
                          {campaign.goal_amount.toLocaleString("fr-FR")} FCFA
                        </Text>
                      </View>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Progression</Text>
                        <Text style={[styles.metaValue, { color: progress >= 0.9 ? Colors.gold?.DEFAULT ?? "#B8860B" : Colors.accent.DEFAULT }]}>
                          {Math.round(progress * 100)}%
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Total collecté</Text>
                      <Text style={[styles.metaValue, { color: Colors.accent.DEFAULT }]}>
                        {campaign.collected_amount.toLocaleString("fr-FR")} FCFA
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Objectif</Text>
                      <Text style={styles.metaValue}>Ouvert</Text>
                    </View>
                  </View>
                )}
              </GlassCard>
            )}

            {/* Linked info */}
            {(campaign.event_name || campaign.daara_name) ? (
              <GlassCard style={styles.linkedCard}>
                <Text style={styles.sectionTitle}>Rattachement</Text>
                {campaign.event_name ? (
                  <View style={styles.linkedRow}>
                    <View style={styles.linkedPill}><Text style={styles.linkedPillLabel}>Événement</Text></View>
                    <Text style={styles.linkedValue}>{campaign.event_name}</Text>
                  </View>
                ) : null}
                {campaign.daara_name ? (
                  <View style={styles.linkedRow}>
                    <View style={styles.linkedPill}><Text style={styles.linkedPillLabel}>Daara</Text></View>
                    <Text style={styles.linkedValue}>{campaign.daara_name}</Text>
                  </View>
                ) : null}
              </GlassCard>
            ) : null}

            {/* Description */}
            {campaign.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>À propos de ce Jëf</Text>
                <Text style={styles.description}>{campaign.description}</Text>
              </View>
            ) : null}

            {/* Statut + Date — résumé compact */}
            <View style={styles.pillsRow}>
              <View style={[styles.infoPill, { backgroundColor: color + "14", borderColor: color + "30" }]}>
                <CalendarDays size={13} color={color} />
                <Text style={[styles.infoPillText, { color }]}>{statusLabel(campaign.status)}</Text>
              </View>
              {deadline ? (
                <View style={styles.infoPill}>
                  <Clock size={13} color={Colors.ink.faint} />
                  <Text style={styles.infoPillText}>{deadline}</Text>
                </View>
              ) : null}
            </View>

            {/* Payment methods avec vraies images */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Moyens de paiement acceptés</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paymentScroll}
              >
                {PAYMENT_METHODS.map((method) => (
                  <View key={method.key} style={styles.paymentItem}>
                    {PAYMENT_LOGOS[method.key] ? (
                      <ExpoImage
                        source={PAYMENT_LOGOS[method.key]}
                        style={styles.paymentLogo}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.paymentLogo, styles.paymentLogoFallback]}>
                        <Text style={styles.paymentLogoFallbackText}>
                          {method.label.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.paymentName}>{method.label}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Voir état — réservé aux privilégiés */}
            {isPrivileged ? (
              <View style={[styles.section, { marginBottom: 40 }]}>
                <Button
                  label="Voir l'état du Ndiguel"
                  variant="outline"
                  onPress={() => router.push(`/campaign/etat-${campaign.id}` as any)}
                  icon={<Users size={18} color={Colors.accent.DEFAULT} />}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {!loading && !campaign ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Campagne introuvable</Text>
            <Text style={styles.emptyText}>
              Cette campagne n'est plus disponible ou l'identifiant est invalide.
            </Text>
          </GlassCard>
        ) : null}
      </ScrollView>

      {/* ─── CTA footer ─── */}
      {campaign ? (
        campaign.status === "active" ? (
          <View style={styles.footer}>
            <Button
              label="Participer Fi Sabillah"
              onPress={handleDonate}
              icon={<Heart size={20} color="#FFF" />}
            />
          </View>
        ) : (
          <View style={styles.footer}>
            <View style={[styles.closedBanner, { backgroundColor: color + "14", borderColor: color + "30" }]}>
              <Text style={[styles.closedText, { color }]}>
                Ce ndiguel est {statusLabel(campaign.status).toLowerCase()} — les contributions sont clôturées.
              </Text>
            </View>
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  header: {
    height: 280,
    justifyContent: "flex-end",
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  headerBg: {
    ...StyleSheet.absoluteFill,
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
  },
  headerArabesque: {
    position: "absolute",
    right: -20,
    bottom: -20,
    width: 200,
    height: 200,
    opacity: 0.12,
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topBarOnImage: {
    // Same position, icons adapt via color
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  iconBtnDark: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  headerContent: {
    gap: 10,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 26,
    lineHeight: 33,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  titleOnImage: {
    color: "#FFF",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  statTextOnImage: {
    color: "rgba(255,255,255,0.85)",
  },
  scroll: {
    padding: 20,
    paddingBottom: 120,
    paddingTop: 20,
    gap: 20,
  },
  loadingCard: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    padding: 18,
    gap: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  metaItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border.DEFAULT,
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    textAlign: "center",
  },
  linkedCard: {
    padding: 16,
    gap: 10,
  },
  linkedRow: {
    gap: 4,
  },
  linkedPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.accent.dim,
  },
  linkedPillLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linkedValue: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  infoPillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
  },
  paymentScroll: {
    gap: 10,
    paddingRight: 8,
  },
  paymentItem: {
    width: 90,
    height: 90,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  paymentLogo: {
    width: 44,
    height: 30,
  },
  paymentLogoFallback: {
    width: 44,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentLogoFallbackText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  paymentName: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.muted,
    textAlign: "center",
  },
  emptyCard: {
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
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
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 38 : 20,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  closedBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  closedText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 20,
  },
});
