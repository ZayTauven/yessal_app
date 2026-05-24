import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import {
  Bell,
  CalendarDays,
  Coins,
  Filter,
  Settings2,
  ShieldCheck,
  Wallet,
} from "lucide-react-native";

const PAYMENT_LOGOS: Record<string, any> = {
  orange_money: require("@/assets/images/orange money.png"),
  wave: require("@/assets/images/sans-contact.png"),
  paypal: require("@/assets/images/pay-pal.png"),
  mastercard: require("@/assets/images/mastercard.png"),
  visa: require("@/assets/images/carte-paiement.png"),
  collector: require("@/assets/images/collecteur.png"),
};

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import type { Donation, PaymentStatus } from "@/types/donation.types";

type DonationFilter = "all" | PaymentStatus;

function formatDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function paymentLabel(status: PaymentStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmé";
    case "failed":
      return "Échoué";
    case "pending_wire":
      return "Virement en attente";
    default:
      return "En attente";
  }
}

function paymentColor(status: PaymentStatus) {
  switch (status) {
    case "confirmed":
      return Colors.status.success;
    case "failed":
      return Colors.status.error;
    case "pending_wire":
      return Colors.accent.DEFAULT;
    default:
      return Colors.accent.DEFAULT;
  }
}

function methodLabel(method: Donation["payment_method"]) {
  const labels: Record<string, string> = {
    orange_money: "Orange Money",
    wave: "Wave",
    paypal: "PayPal",
    bictorys: "Bictorys",
    virement: "Virement",
    collector: "Collecteur",
    manual: "Manuel",
    visa: "Visa",
    mastercard: "Mastercard",
  };
  return labels[method] ?? method;
}

export default function DonationsScreen() {
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DonationFilter>("all");

  const load = async () => {
    try {
      const data = await ContentService.getDonations();
      setDonations(data);
    } catch {
      setDonations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredDonations = useMemo(() => {
    if (filter === "all") {
      return donations;
    }
    return donations.filter((donation) => donation.payment_status === filter);
  }, [donations, filter]);

  const totals = useMemo(() => {
    const total = donations.reduce((sum, donation) => sum + donation.amount, 0);
    const confirmed = donations.filter(
      (donation) => donation.payment_status === "confirmed",
    ).length;
    const pending = donations.filter(
      (donation) => donation.payment_status === "pending",
    ).length;
    return { total, confirmed, pending };
  }, [donations]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Mes Jëfs"
        subtitle="Suivez vos contributions et leur statut"
        icon={<Wallet size={24} color="#FFF" />}
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
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          scrollIndicatorInsets={{ bottom: 180 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
              }}
            />
          }
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <Coins size={18} color={Colors.accent.DEFAULT} />
              <Text style={styles.statValue}>
                {totals.total.toLocaleString()} FCFA
              </Text>
              <Text style={styles.statLabel}>Total contribué</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <ShieldCheck size={18} color={Colors.accent.DEFAULT} />
              <Text style={styles.statValue}>{totals.confirmed}</Text>
              <Text style={styles.statLabel}>Confirmés</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <CalendarDays size={18} color={Colors.accent.DEFAULT} />
              <Text style={styles.statValue}>{totals.pending}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </GlassCard>
          </View>

          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setFilter("all")}
              style={[
                styles.filterChip,
                filter === "all" && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === "all" && styles.filterTextActive,
                ]}
              >
                Tous
              </Text>
            </Pressable>
            {(["pending", "confirmed", "failed"] as DonationFilter[]).map(
              (value) => (
                <Pressable
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[
                    styles.filterChip,
                    filter === value && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === value && styles.filterTextActive,
                    ]}
                  >
                    {paymentLabel(value as PaymentStatus)}
                  </Text>
                </Pressable>
              ),
            )}
            <Filter size={18} color={Colors.ink.faint} />
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
            </View>
          ) : null}

          {!loading && filteredDonations.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucun Jëf trouvé</Text>
              <Text style={styles.emptyText}>
                Les contributions apparaîtront ici après synchronisation avec le
                backend.
              </Text>
            </GlassCard>
          ) : null}

          <View style={styles.list}>
            {filteredDonations.map((donation) => (
              <Pressable
                key={donation.id}
                onPress={() => {
                  if (donation.campaign) {
                    router.push(`/campaign/${donation.campaign}` as any);
                  }
                }}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconWrap}>
                      {PAYMENT_LOGOS[donation.payment_method] ? (
                        <ExpoImage
                          source={PAYMENT_LOGOS[donation.payment_method]}
                          style={styles.paymentLogo}
                          contentFit="contain"
                        />
                      ) : (
                        <Wallet size={18} color={Colors.accent.DEFAULT} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {donation.campaign_name ??
                          `Campagne #${donation.campaign}`}
                      </Text>
                      <Text style={styles.cardSub}>
                        {methodLabel(donation.payment_method)} ·{" "}
                        {formatDate(donation.created_at)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: `${paymentColor(donation.payment_status)}15`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: paymentColor(donation.payment_status) },
                        ]}
                      >
                        {paymentLabel(donation.payment_status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <Text style={styles.amount}>
                      {donation.amount.toLocaleString()} FCFA
                    </Text>
                    <Text style={styles.beneficiary}>
                      {donation.beneficiary_name
                        ? `Bénéficiaire: ${donation.beneficiary_name}`
                        : "Bénéficiaire: Moi-même"}
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        </ScrollView>
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
    paddingHorizontal: 20,
  },
  scroll: {
    paddingTop: 16,
    paddingBottom: 200,
    gap: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  filterChipActive: {
    backgroundColor: Colors.accent.dim,
    borderColor: Colors.accent.DEFAULT,
  },
  filterText: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_600SemiBold",
  },
  filterTextActive: {
    color: Colors.accent.DEFAULT,
  },
  loadingWrap: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  paymentLogo: {
    width: 32,
    height: 22,
  },
  cardTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  cardBottom: {
    gap: 4,
  },
  amount: {
    fontSize: 18,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  beneficiary: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
});
