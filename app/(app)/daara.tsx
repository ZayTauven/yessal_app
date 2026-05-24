import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  Building2,
  Hash,
  Layers,
  MapPin,
  MessageSquare,
  Phone,
  UserCircle,
  Users2,
} from "lucide-react-native";
import { useAuthStore } from "@/store/auth.store";

import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";

export default function DaaraScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [daara, setDaara] = useState<any>(null);
  const [directory, setDirectory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [daaraData, directoryData] = await Promise.all([
        ContentService.getMyDaara(),
        ContentService.getDirectory(),
      ]);
      setDaara(daaraData);
      setDirectory(directoryData);
    } catch (error) {
      console.error("Error loading Daara data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMemberName = (m: any) =>
    m.name ?? (`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Membre");

  // L'API peut retourner ldd comme un objet ou un ID selon le sérialiseur
  const lddObj =
    daara && typeof daara.ldd === "object" && daara.ldd !== null
      ? (daara.ldd as any)
      : null;
  const lddName = daara?.ldd_name ?? lddObj?.name ?? null;
  const lddCode = lddObj?.code ?? null;
  const lddLocation = lddObj?.location ?? null;

  const roleLabel = (role: string) => {
    switch (role) {
      case "member":
        return "Talibé";
      case "chef_daara":
        return "Chef de Daara";
      case "collector":
        return "Collecteur";
      case "admin":
        return "Administrateur";
      default:
        return role.replace(/_/g, " ");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {loading && !daara ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.accent.DEFAULT} size="large" />
            <Text style={styles.loadingText}>Chargement de votre Daara...</Text>
          </View>
        ) : !daara ? (
          <View style={styles.emptyState}>
            <Building2 size={64} color={Colors.ink.faint} />
            <Text style={styles.emptyTitle}>Aucun Daara affilié</Text>
            <Text style={styles.emptySubtitle}>
              Contactez votre Chef Daara pour être rattaché à une communauté.
            </Text>
            <Button
              label="Réessayer"
              onPress={loadData}
              variant="outline"
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          <>
            {/* Header Banner - Web Aligned */}
            <View style={styles.headerBanner}>
              <View style={styles.headerInfo}>
                <View style={styles.headerLabelRow}>
                  <Building2 size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.headerLabel}>Mon Daara</Text>
                </View>
                <Text style={styles.daaraName}>{daara.name}</Text>
                <View style={styles.headerMeta}>
                  {lddName && (
                    <View style={styles.metaItem}>
                      <Layers size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.metaText}>{lddName}</Text>
                    </View>
                  )}
                  {lddLocation && (
                    <View style={styles.metaItem}>
                      <MapPin size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.metaText}>{lddLocation}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.headerIconContainer}>
                <Building2 size={32} color="#FFF" />
              </View>
            </View>

            {/* Info chips: LDD + Code + Statut */}
            <View style={styles.infoChipsRow}>
              {lddName ? (
                <View style={styles.infoChip}>
                  <Layers size={13} color={Colors.accent.DEFAULT} />
                  <Text style={styles.infoChipText}>{lddName}</Text>
                </View>
              ) : null}
              {lddCode ? (
                <View style={styles.infoChip}>
                  <Hash size={13} color={Colors.accent.DEFAULT} />
                  <Text style={styles.infoChipText}>{lddCode}</Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.infoChip,
                  daara.is_active ? styles.chipActive : styles.chipInactive,
                ]}
              >
                <Activity
                  size={13}
                  color={daara.is_active ? "#22C55E" : "#EF4444"}
                />
                <Text
                  style={[
                    styles.infoChipText,
                    { color: daara.is_active ? "#22C55E" : "#EF4444" },
                  ]}
                >
                  {daara.is_active ? "Actif" : "Inactif"}
                </Text>
              </View>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Chef de Daara</Text>
                  <UserCircle size={14} color={Colors.ink.faint} />
                </View>
                <View style={styles.statBody}>
                  <Text style={styles.statMainValue}>
                    {daara.chef_full_name || "Non désigné"}
                  </Text>
                  <Text style={styles.statSubValue}>
                    {daara.members_count || 0} membres
                  </Text>
                </View>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Description</Text>
                </View>
                <View style={styles.statBody}>
                  <Text style={styles.statValue} numberOfLines={3}>
                    {daara.description || "Aucune description disponible."}
                  </Text>
                </View>
              </GlassCard>
            </View>

            {/* Collectors Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Collecteurs</Text>
              {daara.collectors && daara.collectors.length > 0 ? (
                <View style={styles.collectorList}>
                  {daara.collectors.map((c: any) => (
                    <GlassCard key={c.id} style={styles.collectorCard}>
                      <View style={styles.collectorInfo}>
                        <Avatar
                          uri={c.avatar_url ?? c.avatar}
                          name={getMemberName(c)}
                          size={40}
                          borderRadius={12}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.collectorName}>
                            {getMemberName(c)}
                          </Text>
                          <Text style={styles.collectorPhone}>
                            {c.phone || "Pas de numéro"}
                          </Text>
                        </View>
                        {c.phone && (
                          <Pressable
                            style={styles.callBtn}
                            onPress={() => {
                              const { Linking } = require("react-native");
                              Linking.openURL(`tel:${c.phone}`);
                            }}
                          >
                            <Phone size={16} color={Colors.accent.DEFAULT} />
                          </Pressable>
                        )}
                      </View>
                    </GlassCard>
                  ))}
                </View>
              ) : (
                <GlassCard style={styles.emptyCollectorCard}>
                  <Text style={styles.emptyCollectorText}>
                    Aucun collecteur désigné.
                  </Text>
                </GlassCard>
              )}
            </View>

            {/* Directory Section - Other Members */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Users2 size={20} color={Colors.accent.DEFAULT} />
                <Text style={styles.sectionTitleMain}>
                  Les membres de mon Daara
                </Text>
              </View>

              {/* Bouton Chat de groupe du Daara */}
              <Pressable
                style={styles.groupChatBtn}
                onPress={() => router.push("/chat" as any)}
              >
                <View style={styles.groupChatIcon}>
                  <MessageSquare size={18} color="#FFF" />
                </View>
                <Text style={styles.groupChatText}>
                  Ouvrir le Chat du Daara
                </Text>
              </Pressable>

              <View style={styles.directoryList}>
                {directory.filter((m) => m.id !== user?.id).length > 0 ? (
                  directory
                    .filter((m) => m.id !== user?.id)
                    .map((member) => (
                      <GlassCard key={member.id} style={styles.memberCard}>
                        <View style={styles.memberRow}>
                          <Avatar
                            uri={member.avatar_url ?? member.avatar}
                            name={getMemberName(member)}
                            size={38}
                            borderRadius={12}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>
                              {getMemberName(member)}
                            </Text>
                            <Text style={styles.memberRole}>
                              {roleLabel(member.role)}
                            </Text>
                          </View>
                          {member.phone && (
                            <Pressable
                              style={styles.callBtn}
                              onPress={() => {
                                const { Linking } = require("react-native");
                                Linking.openURL(`tel:${member.phone}`);
                              }}
                            >
                              <Phone size={16} color={Colors.accent.DEFAULT} />
                            </Pressable>
                          )}
                        </View>
                      </GlassCard>
                    ))
                ) : (
                  <Text style={styles.emptyDirectoryText}>
                    Aucun autre membre trouvé.
                  </Text>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 20,
    gap: 20,
  },
  loadingContainer: {
    paddingTop: 100,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  emptyState: {
    paddingTop: 80,
    alignItems: "center",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.ink.muted,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  headerBanner: {
    backgroundColor: Colors.accent.DEFAULT, // Use primary color as fallback for gradient
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  headerInfo: {
    flex: 1,
    zIndex: 2,
  },
  headerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: "Inter_900Black",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  daaraName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  headerMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_600SemiBold",
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  infoChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.accent.dim,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  chipActive: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  chipInactive: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  infoChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent.DEFAULT,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_900Black",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusActive: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  statusInactive: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  statusTextActive: {
    color: "#22C55E",
  },
  statusTextInactive: {
    color: "#EF4444",
  },
  statBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  statValue: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
  statMainValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  statSubValue: {
    fontSize: 11,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_900Black",
    color: Colors.ink.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionTitleMain: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  collectorList: {
    gap: 10,
  },
  collectorCard: {
    padding: 12,
  },
  collectorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  collectorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: Colors.accent.DEFAULT,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  collectorName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  collectorPhone: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  emptyCollectorCard: {
    padding: 20,
    alignItems: "center",
  },
  emptyCollectorText: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  groupChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  groupChatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupChatText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  manageButton: {
    marginVertical: 10,
  },
  directoryList: {
    gap: 10,
  },
  memberCard: {
    padding: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  memberRole: {
    fontSize: 11,
    color: Colors.ink.muted,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    marginTop: 2,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDirectoryText: {
    fontSize: 13,
    color: Colors.ink.faint,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 10,
  },
});
