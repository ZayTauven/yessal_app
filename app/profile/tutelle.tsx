import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Heart, UserPlus, Users, PencilLine } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ContentService } from "@/lib/content.service";
import type { Campaign } from "@/types/campaign.types";
import type { PaymentMethod } from "@/types/donation.types";
import type { Tutelle } from "@/types/content.types";

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "orange_money", label: "Orange Money" },
  { value: "wave", label: "Wave" },
  { value: "manual", label: "Manuel" },
];

function formatAmount(value: number) {
  return `${value.toLocaleString()} FCFA`;
}

export default function TutelleScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tutelles, setTutelles] = useState<Tutelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [amount, setAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("manual");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [memberRelation, setMemberRelation] = useState("");

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

        const fallbackCampaign = campaignData.find((item) => item.status === "active") ?? campaignData[0];
        if (fallbackCampaign) {
          setSelectedCampaignId(fallbackCampaign.id);
        }

        if (tutelleData.length > 0) {
          setSelectedMemberId(tutelleData[0].id);
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
  }, []);

  const selectedMember = useMemo(
    () => tutelles.find((member) => member.id === selectedMemberId) ?? null,
    [selectedMemberId, tutelles],
  );

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

  const handleContribute = async () => {
    if (!selectedCampaign) {
      Alert.alert("Campagne requise", "Choisissez une campagne avant de continuer.");
      return;
    }

    if (!finalAmount) {
      Alert.alert("Montant requis", "Ajoutez un montant valide.");
      return;
    }

    setSubmitting(true);
    try {
      await ContentService.createDonation({
        campaign: selectedCampaign.id,
        amount: finalAmount,
        payment_method: paymentMethod,
        beneficiary: selectedMember?.id ?? null,
      });

      Alert.alert("Contribution envoyée", "Votre don a bien été soumis.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer la contribution.";
      Alert.alert("Erreur", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMember = async () => {
    const first_name = memberFirstName.trim();
    const last_name = memberLastName.trim();
    const relation = memberRelation.trim();

    if (!first_name || !last_name || !relation) {
      Alert.alert("Champs requis", "Complétez le prénom, le nom et le lien de parenté.");
      return;
    }

    setCreating(true);
    try {
      const created = await ContentService.createTutelle({
        first_name,
        last_name,
        relation,
      });
      setTutelles((current) => [created, ...current]);
      setSelectedMemberId(created.id);
      setMemberFirstName("");
      setMemberLastName("");
      setMemberRelation("");
      setShowAdd(false);
      Alert.alert("Succès", "Membre ajouté à votre tutelle.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'ajouter le membre.";
      Alert.alert("Erreur", message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <SectionHeader
        title="Tutelle familiale"
        subtitle="Suivez les dons effectués au nom de vos proches"
        icon={<Users size={24} color="#FFF" />}
      />

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          contentInsetAdjustmentBehavior="automatic"
          scrollIndicatorInsets={{ bottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.ink.DEFAULT} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>

          <GlassCard style={styles.introCard}>
            <Text style={styles.introTitle}>Gérez votre cercle familial</Text>
            <Text style={styles.introText}>
              Enregistrez les membres de votre famille pour effectuer des dons en leur nom et garder une
              vision claire de votre tutelle.
            </Text>
          </GlassCard>

          <Text style={styles.sectionTitle}>Campagne liée</Text>
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
              {campaigns.map((campaign) => {
                const active = selectedCampaignId === campaign.id;
                const progress =
                  campaign.goal_amount > 0 ? campaign.collected_amount / campaign.goal_amount : 0;

                return (
                  <Pressable
                    key={campaign.id}
                    onPress={() => setSelectedCampaignId(campaign.id)}
                    style={[styles.campaignCard, active && styles.campaignCardActive]}
                  >
                    <Text style={styles.memberName} numberOfLines={2}>
                      {campaign.name}
                    </Text>
                    <Text style={styles.memberRel}>
                      {campaign.collected_amount.toLocaleString()} / {campaign.goal_amount.toLocaleString()} FCFA
                    </Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressBar, { width: `${Math.max(progress * 100, 8)}%` }]} />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.sectionTitle}>Membres enregistrés</Text>
          {tutelles.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRow}>
              {tutelles.map((member) => {
                const active = selectedMemberId === member.id;
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => setSelectedMemberId(member.id)}
                    style={[styles.memberCard, active && styles.memberCardActive]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{member.first_name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
                    <Text style={styles.memberRel}>{member.relation}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucun membre enregistré</Text>
              <Text style={styles.emptyText}>Ajoutez un premier membre pour l’utiliser comme bénéficiaire.</Text>
            </GlassCard>
          )}

          <GlassCard style={styles.contributionCard}>
            <View style={styles.contributionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Contribution rapide</Text>
                <Text style={styles.formHint}>
                  Pour {selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : "votre tutelle"}
                </Text>
              </View>
              <View style={styles.pill}>
                <PencilLine size={12} color={Colors.accent.DEFAULT} />
                <Text style={styles.pillText}>Montant libre</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amountRow}>
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
                  Saisir un montant libre sans parcourir le carrousel.
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

            <View style={styles.paymentRow}>
              {PAYMENT_METHODS.map((method) => {
                const active = paymentMethod === method.value;
                return (
                  <Pressable
                    key={method.value}
                    onPress={() => setPaymentMethod(method.value)}
                    style={[styles.paymentChip, active && styles.paymentChipActive]}
                  >
                    <Text style={[styles.paymentText, active && styles.paymentTextActive]}>
                      {method.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Montant sélectionné</Text>
              <Text style={styles.summaryValue}>{finalAmount ? formatAmount(finalAmount) : "0 FCFA"}</Text>
              <Text style={styles.summarySub}>
                {selectedCampaign ? selectedCampaign.name : "Aucune campagne sélectionnée"}
              </Text>
            </View>

            <Button
              label="Contribuer"
              onPress={handleContribute}
              loading={submitting}
              icon={<Heart size={16} color="#fff" />}
            />
          </GlassCard>

          <Text style={styles.sectionTitle}>Gérer la tutelle</Text>
          <View style={styles.list}>
            {tutelles.map((member) => (
              <GlassCard key={member.id} style={styles.memberListCard}>
                <View style={styles.memberRowVertical}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.first_name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {member.first_name} {member.last_name}
                    </Text>
                    <Text style={styles.memberRel}>{member.relation}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.ink.ghost} />
                </View>
              </GlassCard>
            ))}
          </View>

          {showAdd && (
            <GlassCard style={styles.formCard}>
              <Text style={styles.formTitle}>Ajouter un membre</Text>
              <Input
                label="Prénom"
                placeholder="Ex: Souleymane"
                value={memberFirstName}
                onChangeText={setMemberFirstName}
              />
              <Input
                label="Nom"
                placeholder="Ex: Diop"
                value={memberLastName}
                onChangeText={setMemberLastName}
              />
              <Input
                label="Lien de parenté"
                placeholder="Ex: Fils, père, épouse"
                value={memberRelation}
                onChangeText={setMemberRelation}
              />
              <View style={styles.formActions}>
                <Button
                  label="Annuler"
                  variant="outline"
                  onPress={() => setShowAdd(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Enregistrer"
                  onPress={handleCreateMember}
                  loading={creating}
                  style={{ flex: 1.5 }}
                />
              </View>
            </GlassCard>
          )}

          <Button
            label="Ajouter un membre"
            icon={<UserPlus size={16} color={Colors.accent.DEFAULT} />}
            onPress={() => setShowAdd((value) => !value)}
            variant="outline"
          />
        </ScrollView>
      </View>
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
    paddingBottom: 180,
    gap: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
  },
  introCard: {
    padding: 18,
  },
  introTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginBottom: 8,
  },
  introText: {
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
  },
  loadingCard: {
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
  },
  campaignRow: {
    gap: 10,
    paddingRight: 4,
  },
  campaignCard: {
    width: 190,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    gap: 10,
  },
  campaignCardActive: {
    borderColor: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent.dim,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface.muted,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.accent.DEFAULT,
  },
  memberRow: {
    gap: 12,
    paddingRight: 4,
  },
  memberCard: {
    width: 180,
    padding: 16,
    gap: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  memberCardActive: {
    borderColor: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent.dim,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  memberName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
  },
  memberRel: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  emptyCard: {
    padding: 16,
  },
  emptyTitle: {
    fontSize: 14,
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
  contributionCard: {
    padding: 18,
    gap: 14,
  },
  contributionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  formHint: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.accent.dim,
  },
  pillText: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  amountRow: {
    gap: 10,
    paddingRight: 4,
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
  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paymentChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.surface.subtle,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  paymentChipActive: {
    backgroundColor: Colors.accent.dim,
    borderColor: Colors.accent.DEFAULT,
  },
  paymentText: {
    fontSize: 12,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_600SemiBold",
  },
  paymentTextActive: {
    color: Colors.accent.DEFAULT,
  },
  summaryBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface.subtle,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 24,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  summarySub: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  list: {
    gap: 12,
  },
  memberListCard: {
    padding: 16,
  },
  memberRowVertical: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  formCard: {
    marginTop: 8,
    padding: 18,
    gap: 12,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
});
