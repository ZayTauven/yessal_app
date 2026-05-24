import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Heart, UserPlus, Users } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ContentService } from "@/lib/content.service";
import type { Tutelle } from "@/types/content.types";

const RELATION_COLORS: Record<string, string> = {
  père: "#6366F1",
  mère: "#EC4899",
  fils: "#0EA5E9",
  fille: "#F59E0B",
  frère: "#10B981",
  sœur: "#8B5CF6",
  épouse: "#EF4444",
  époux: "#3B82F6",
};

function avatarColor(relation: string) {
  const key = relation.toLowerCase().trim();
  for (const [k, v] of Object.entries(RELATION_COLORS)) {
    if (key.includes(k)) return v;
  }
  let hash = 0;
  for (let i = 0; i < relation.length; i++) hash = relation.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ["#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899"];
  return palette[Math.abs(hash) % palette.length];
}

export default function TutelleScreen() {
  const router = useRouter();
  const [tutelles, setTutelles] = useState<Tutelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [memberRelation, setMemberRelation] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const tutelleData = await ContentService.getTutelles();
        if (active) setTutelles(tutelleData);
      } catch {
        if (active) setTutelles([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

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
      const created = await ContentService.createTutelle({ first_name, last_name, relation });
      setTutelles((current) => [created, ...current]);
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
        subtitle="Gérez les membres de votre cercle familial"
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
            <Text style={styles.introTitle}>Vos proches en tutelle</Text>
            <Text style={styles.introText}>
              Enregistrez les membres de votre famille pour effectuer des dons en leur nom depuis
              l'écran de contribution.
            </Text>
          </GlassCard>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
            </View>
          ) : tutelles.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucun membre enregistré</Text>
              <Text style={styles.emptyText}>
                Ajoutez un premier proche pour lui dédier des contributions.
              </Text>
            </GlassCard>
          ) : (
            <View style={styles.list}>
              {tutelles.map((member) => {
                const color = avatarColor(member.relation);
                const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase();

                return (
                  <GlassCard key={member.id} style={styles.memberCard}>
                    <View style={styles.memberRow}>
                      <View style={[styles.avatar, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                        <Text style={[styles.avatarText, { color }]}>{initials}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
                        <View style={[styles.relationChip, { backgroundColor: `${color}18` }]}>
                          <Text style={[styles.relationText, { color }]}>{member.relation}</Text>
                        </View>
                      </View>
                    </View>

                    <Pressable
                      style={styles.contributeBtn}
                      onPress={() =>
                        router.push(`/(app)/donate?beneficiary=${member.id}` as any)
                      }
                    >
                      <Heart size={14} color={Colors.accent.DEFAULT} />
                      <Text style={styles.contributeBtnText}>
                        Contribuer pour {member.first_name}
                      </Text>
                      <ChevronRight size={14} color={Colors.accent.DEFAULT} />
                    </Pressable>
                  </GlassCard>
                );
              })}
            </View>
          )}

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
            label={showAdd ? "Fermer le formulaire" : "Ajouter un membre"}
            icon={<UserPlus size={16} color={Colors.accent.DEFAULT} />}
            onPress={() => setShowAdd((v) => !v)}
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
    gap: 8,
  },
  introTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  loadingWrap: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  list: {
    gap: 12,
  },
  memberCard: {
    padding: 16,
    gap: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  relationChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  relationText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  contributeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.accent.dim,
    borderWidth: 1,
    borderColor: `${Colors.accent.DEFAULT}40`,
  },
  contributeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    flex: 1,
    textAlign: "center",
  },
  formCard: {
    padding: 18,
    gap: 12,
  },
  formTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
});
