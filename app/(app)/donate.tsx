import { useEffect, useMemo, useState } from "react";
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  Clipboard as ClipboardIcon,
  HandCoins,
  Heart,
  PencilLine,
  Settings2,
  ShieldCheck,
  Wallet,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SuccessCelebration } from "@/components/modals/SuccessCelebration";
import { ContentService } from "@/lib/content.service";
import type { Campaign } from "@/types/campaign.types";
import type { PaymentMethod } from "@/types/donation.types";
import type { Tutelle } from "@/types/content.types";

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: typeof Wallet;
}[] = [
  { value: "orange_money", label: "Orange Money", hint: "Mobile money", icon: Wallet },
  { value: "wave", label: "Wave", hint: "Paiement rapide", icon: Heart },
  { value: "visa", label: "Visa", hint: "Carte bancaire", icon: ShieldCheck },
  { value: "mastercard", label: "Mastercard", hint: "Carte bancaire", icon: ShieldCheck },
  { value: "collector", label: "Collecteur", hint: "Collecte physique", icon: Wallet },
  { value: "paypal", label: "PayPal", hint: "International", icon: HandCoins },
  { value: "virement", label: "Virement", hint: "Banque / Chèque", icon: Wallet },
];

function parseCampaignId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatAmount(value: number) {
  return `${value.toLocaleString()} FCFA`;
}

export default function DonateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ campaignId?: string | string[] }>();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tutelles, setTutelles] = useState<Tutelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<number | null>(null);
  const [amount, setAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("orange_money");
  const [wireRef, setWireRef] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [campaignData, tutelleData] = await Promise.all([
          ContentService.getCampaigns(),
          ContentService.getTutelles(),
        ]);

        if (!active) {
          return;
        }

        setCampaigns(campaignData);
        setTutelles(tutelleData);

        const preferredCampaignId = parseCampaignId(params.campaignId);
        const fallbackCampaign = campaignData.find((item) => item.status === "active") ?? campaignData[0];
        const selected = campaignData.find((item) => item.id === preferredCampaignId) ?? fallbackCampaign;

        if (selected) {
          setSelectedCampaignId(selected.id);
        }

        if (tutelleData.length > 0) {
          setSelectedBeneficiaryId(tutelleData[0].id);
        }
      } catch {
        if (active) {
          setCampaigns([]);
          setTutelles([]);
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
  }, [params.campaignId]);

  const selectedCampaign = useMemo(
    () => campaigns.find((item) => item.id === selectedCampaignId) ?? campaigns[0] ?? null,
    [campaigns, selectedCampaignId],
  );

  useEffect(() => {
    if (!selectedCampaign && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaign]);

  const finalAmount = useMemo(() => {
    if (!useCustomAmount) {
      return amount;
    }

    const parsed = Number(customAmount.replace(/[^\d]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amount, customAmount, useCustomAmount]);

  const selectedBeneficiary = tutelles.find((item) => item.id === selectedBeneficiaryId) ?? null;

  const handleSubmit = async () => {
    if (!selectedCampaign) {
      Alert.alert("Campagne requise", "Choisissez une campagne avant de continuer.");
      return;
    }

    if (selectedCampaign.status !== "active") {
      Alert.alert(
        "Campagne indisponible",
        "Choisissez une campagne active pour continuer la contribution.",
      );
      return;
    }

    if (!finalAmount) {
      Alert.alert("Montant requis", "Ajoutez un montant valide.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the donation record
      const donation = await ContentService.createDonation({
        campaign: selectedCampaign.id,
        amount: finalAmount,
        payment_method: paymentMethod,
        beneficiary: selectedBeneficiary?.id ?? null,
        external_ref: paymentMethod === "virement" ? wireRef.trim() : null,
      } as any);

      // 2. Handle digital/physical payments
      if (paymentMethod === "collector") {
        setSuccessTitle("Demande de collecte");
        setSuccessMessage(
          "Les collecteurs et le responsable de votre daara ont été notifiés pour venir récupérer votre contribution physique."
        );
        setSuccessVisible(true);
        return;
      }

      if (paymentMethod === "virement") {
        setSuccessTitle("Virement enregistré");
        setSuccessMessage(
          "Votre déclaration de virement a été reçue. Elle sera validée dès réception des fonds sur notre compte."
        );
        setSuccessVisible(true);
        return;
      }

      // 2. If it's a digital payment (Bictorys), initiate payment
      if (paymentMethod !== "paypal") {
        const paymentResult = await ContentService.payDonation(donation.id, paymentMethod);
        
        if (paymentMethod === "visa" || paymentMethod === "mastercard") {
          if (paymentResult.checkout_url) {
            const { Linking } = await import("react-native");
            await Linking.openURL(paymentResult.checkout_url);
            
            setSuccessTitle("Paiement initié");
            setSuccessMessage(
              "Vous allez être redirigé vers la page de paiement sécurisée de Bictorys."
            );
            setSuccessVisible(true);
            return;
          }
        } else {
          // Mobile Money (Direct API)
          setSuccessTitle("Jëf initié");
          setSuccessMessage(
            `Une demande de paiement ${paymentMethod === "wave" ? "Wave" : "Orange Money"} a été envoyée. Veuillez valider sur votre téléphone.`
          );
          setSuccessVisible(true);
          return;
        }
      }

      // 3. For manual or already handled payments
      setSuccessTitle("Jëf enregistré");
      setSuccessMessage(
        `Votre contribution de ${formatAmount(finalAmount)} pour ${selectedCampaign.name} a été soumise avec succès.`
      );
      setSuccessVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de créer le Jëf.";
      Alert.alert("Erreur", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <SectionHeader
        title="Jëf"
        subtitle="Choisissez une campagne, un montant et votre mode de paiement"
        icon={<Heart size={24} color="#FFF" />}
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
          contentContainerStyle={styles.scroll}
        >
          <GlassCard style={styles.heroCard}>
            <Text style={styles.heroTitle}>Contribuer en toute simplicité</Text>
            <Text style={styles.heroText}>
              Sélectionnez une campagne active, choisissez le montant adapté et
              finalisez votre Jëf depuis le mobile.
            </Text>
          </GlassCard>

          <Text style={styles.sectionTitle}>Campagne</Text>
          {loading ? (
            <GlassCard style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
            </GlassCard>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.campaignRow}
            >
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => {
                  const active = selectedCampaign?.id === campaign.id;
                  const progress =
                    campaign.goal_amount > 0 ? campaign.collected_amount / campaign.goal_amount : 0;

                  return (
                    <Pressable
                      key={campaign.id}
                      onPress={() => setSelectedCampaignId(campaign.id)}
                      style={({ pressed }) => [styles.campaignPressable, pressed && styles.pressed]}
                    >
                      <GlassCard style={[styles.campaignCard, active && styles.campaignCardActive]}>
                        <View style={styles.campaignTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.campaignName} numberOfLines={2}>
                              {campaign.name}
                            </Text>
                            <Text style={styles.campaignMeta}>
                              {campaign.collected_amount.toLocaleString()} /{" "}
                              {campaign.goal_amount.toLocaleString()} FCFA
                            </Text>
                          </View>
                          <View style={[styles.badge, active && styles.badgeActive]}>
                            <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                              {campaign.status === "active"
                                ? "En cours"
                                : campaign.status === "completed"
                                  ? "Clôturée"
                                  : "En attente"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.progressTrack}>
                          <View style={[styles.progressBar, { width: `${Math.max(progress * 100, 8)}%` }]} />
                        </View>
                      </GlassCard>
                    </Pressable>
                  );
                })
              ) : (
                <GlassCard style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Aucune campagne disponible pour le moment.</Text>
                </GlassCard>
              )}
            </ScrollView>
          )}

          <Text style={styles.sectionTitle}>Montant</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.amountRow}
          >
            {QUICK_AMOUNTS.map((value) => {
              const active = !useCustomAmount && amount === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setUseCustomAmount(false);
                    setAmount(value);
                  }}
                  style={[styles.amountChip, active && styles.amountChipActive]}
                >
                  <Text style={[styles.amountText, active && styles.amountTextActive]}>
                    {formatAmount(value)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={() => setUseCustomAmount(true)}
            style={[styles.customAmountButton, useCustomAmount && styles.customAmountButtonActive]}
          >
            <View style={[styles.customAmountIcon, useCustomAmount && styles.customAmountIconActive]}>
              <PencilLine size={14} color={useCustomAmount ? "#FFF" : Colors.accent.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customAmountTitle, useCustomAmount && styles.customAmountTitleActive]}>
                Montant personnalisé
              </Text>
              <Text style={[styles.customAmountSubtitle, useCustomAmount && styles.customAmountSubtitleActive]}>
                Saisissez un montant libre sans parcourir les options.
              </Text>
            </View>
          </Pressable>

          {useCustomAmount && (
            <Input
              label="Montant personnalisé"
              placeholder="Ex: 15000"
              keyboardType="numeric"
              value={customAmount}
              onChangeText={(value) => setCustomAmount(value.replace(/[^\d]/g, ""))}
            />
          )}

          <Text style={styles.sectionTitle}>Bénéficiaire</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.beneficiaryRow}
          >
            <Pressable
              onPress={() => setSelectedBeneficiaryId(null)}
              style={[styles.beneficiaryCard, selectedBeneficiaryId === null && styles.beneficiaryCardActive]}
            >
              <Text style={styles.beneficiaryName}>Moi-même</Text>
              <Text style={styles.beneficiaryMeta}>Aucun bénéficiaire ajouté</Text>
            </Pressable>

            {tutelles.map((member) => {
              const active = selectedBeneficiaryId === member.id;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => setSelectedBeneficiaryId(member.id)}
                  style={[styles.beneficiaryCard, active && styles.beneficiaryCardActive]}
                >
                  <Text style={styles.beneficiaryName}>
                    {member.first_name} {member.last_name}
                  </Text>
                  <Text style={styles.beneficiaryMeta}>{member.relation}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>Paiement</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_METHODS.map((method) => {
              const active = paymentMethod === method.value;
              const Icon = method.icon;
              return (
                <Pressable
                  key={method.value}
                  onPress={() => setPaymentMethod(method.value)}
                  style={[styles.paymentCard, active && styles.paymentCardActive]}
                >
                  <View style={[styles.paymentIcon, active && styles.paymentIconActive]}>
                    <Icon size={16} color={active ? "#FFF" : Colors.accent.DEFAULT} />
                  </View>
                  <Text style={styles.paymentLabel}>{method.label}</Text>
                  <Text style={styles.paymentHint}>{method.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          {paymentMethod === "virement" && (
            <GlassCard style={styles.wireCard}>
              <Text style={styles.wireTitle}>Informations de virement</Text>
              <Text style={styles.wireText}>
                Veuillez effectuer le virement sur le compte suivant :
                {"\n"}• BANQUE : CBAO
                {"\n"}• RIB : SN012 01234 123456789012 34
                {"\n"}• TITULAIRE : YESSAL GUI
              </Text>
              <View style={styles.virementRefContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.virementRefLabel}>Référence suggérée :</Text>
                  <Text style={styles.virementRefValue}>{selectedCampaign?.id ? `YSL-${selectedCampaign.id}-${Date.now().toString().slice(-4)}` : "YSL-D-001"}</Text>
                </View>
                <Pressable 
                  style={styles.copyBtn}
                  onPress={async () => {
                    const ref = selectedCampaign?.id ? `YSL-${selectedCampaign.id}-${Date.now().toString().slice(-4)}` : "YSL-D-001";
                    await Clipboard.setStringAsync(ref);
                    Alert.alert("Copié", "La référence a été copiée.");
                    setWireRef(ref);
                  }}
                >
                  <ClipboardIcon size={18} color={Colors.accent.DEFAULT} />
                </Pressable>
              </View>
              <Input
                label="Référence du virement (à confirmer)"
                placeholder="Ex: VIR-2024-001"
                value={wireRef}
                onChangeText={setWireRef}
              />
            </GlassCard>
          )}

          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Récapitulatif</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Campagne</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {selectedCampaign?.name ?? "Aucune sélection"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bénéficiaire</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {selectedBeneficiary
                  ? `${selectedBeneficiary.first_name} ${selectedBeneficiary.last_name}`
                  : "Moi-même"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Montant</Text>
              <Text style={styles.summaryAmount}>
                {finalAmount ? formatAmount(finalAmount) : "0 FCFA"}
              </Text>
            </View>
          </GlassCard>

          <Button
            label="Continuer"
            onPress={handleSubmit}
            loading={submitting}
            icon={<Heart size={16} color="#fff" />}
          />
        </ScrollView>
      </View>

      <SuccessCelebration
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        onClose={() => {
          setSuccessVisible(false);
          router.replace("/home" as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    flex: 1,
    marginTop: 0,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 220,
    gap: 14,
  },
  heroCard: {
    padding: 18,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 4,
    marginTop: 4,
  },
  loadingCard: {
    minHeight: 126,
    alignItems: "center",
    justifyContent: "center",
  },
  campaignRow: {
    gap: 12,
    paddingRight: 8,
    paddingBottom: 6,
  },
  campaignPressable: {
    width: 258,
  },
  pressed: {
    opacity: 0.85,
  },
  campaignCard: {
    padding: 16,
    gap: 12,
  },
  campaignCardActive: {
    borderColor: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent.dim,
  },
  campaignTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  campaignName: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  campaignMeta: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface.subtle,
  },
  badgeActive: {
    backgroundColor: Colors.accent.DEFAULT,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  badgeTextActive: {
    color: "#FFF",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface.muted,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.accent.DEFAULT,
  },
  emptyCard: {
    minHeight: 126,
    alignItems: "center",
    justifyContent: "center",
    width: 260,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  amountRow: {
    gap: 10,
    paddingRight: 8,
  },
  amountChip: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface.subtle,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  amountChipActive: {
    backgroundColor: Colors.accent.DEFAULT,
    borderColor: Colors.accent.DEFAULT,
  },
  amountText: {
    fontSize: 13,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
  amountTextActive: {
    color: "#FFF",
  },
  customAmountButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface.subtle,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  customAmountButtonActive: {
    borderColor: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent.dim,
  },
  customAmountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  customAmountIconActive: {
    backgroundColor: Colors.accent.DEFAULT,
  },
  customAmountTitle: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  customAmountTitleActive: {
    color: Colors.ink.DEFAULT,
  },
  customAmountSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  customAmountSubtitleActive: {
    color: Colors.ink.muted,
  },
  beneficiaryRow: {
    gap: 10,
    paddingRight: 8,
  },
  beneficiaryCard: {
    minWidth: 160,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface.subtle,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    gap: 4,
  },
  beneficiaryCardActive: {
    backgroundColor: Colors.accent.dim,
    borderColor: Colors.accent.DEFAULT,
  },
  beneficiaryName: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  beneficiaryMeta: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paymentCard: {
    width: "48%",
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface.subtle,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    gap: 6,
  },
  paymentCardActive: {
    backgroundColor: Colors.accent.dim,
    borderColor: Colors.accent.DEFAULT,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surface.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconActive: {
    backgroundColor: Colors.accent.DEFAULT,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  paymentHint: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  summaryCard: {
    padding: 16,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    flex: 1.2,
    fontSize: 13,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  summaryAmount: {
    flex: 1.2,
    fontSize: 16,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  wireCard: {
    padding: 16,
    backgroundColor: Colors.surface.muted,
  },
  wireTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 8,
  },
  wireText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  virementRefContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface.DEFAULT,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    gap: 12,
  },
  virementRefLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    textTransform: "uppercase",
  },
  virementRefValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
});
