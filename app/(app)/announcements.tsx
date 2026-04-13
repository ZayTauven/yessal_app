import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Megaphone, Sparkles } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import type { Announcement, Urgency } from "@/types/content.types";

const FILTERS: { label: string; value: "all" | Urgency }[] = [
  { label: "Toutes", value: "all" },
  { label: "Info", value: "info" },
  { label: "À suivre", value: "warning" },
  { label: "Critiques", value: "critical" },
];

function urgencyLabel(value: Urgency) {
  switch (value) {
    case "critical":
      return "Critique";
    case "warning":
      return "À suivre";
    default:
      return "Info";
  }
}

export default function AnnouncementsScreen() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | Urgency>("all");

  const load = async () => {
    try {
      const data = await ContentService.getAnnouncements();
      setItems(data.filter((item) => item.is_published));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return items
      .filter((item) => item.urgency === filter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filter, items]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Annonces"
        subtitle="Tous les messages publiés de votre Daara"
        icon={<Megaphone size={24} color="#FFF" />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          await load();
        }} />}
      >
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Sparkles size={16} color="#FFF" />
              </View>
              <Text style={styles.heroBadge}>Flux publié</Text>
            </View>
            <Text style={styles.heroTitle}>Les annonces au même endroit.</Text>
            <Text style={styles.heroText}>
              Vous retrouvez ici l’ensemble des messages publiés par la communauté, triés par
              fraîcheur et par niveau d’urgence.
            </Text>
          </GlassCard>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => setFilter(item.value)}
              style={[styles.filterChip, filter === item.value && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {filteredItems.length === 0 && !loading ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune annonce trouvée</Text>
            <Text style={styles.emptyText}>
              Essayez un autre filtre ou revenez plus tard pour voir les nouvelles publications.
            </Text>
          </GlassCard>
        ) : null}

        <View style={styles.list}>
          {filteredItems.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Megaphone size={18} color={Colors.accent.DEFAULT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMeta}>
                    {urgencyLabel(item.urgency)}
                    {item.daara_name ? ` · ${item.daara_name}` : ""}
                  </Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusText}>Publié</Text>
                </View>
              </View>

              <Text style={styles.cardText}>{item.content}</Text>
              <View style={styles.bottomRow}>
                <Text style={styles.bottomMeta}>
                  {item.target_role !== "all" ? item.target_role : "Tous les membres"}
                </Text>
                <Text style={styles.bottomMeta}>
                  {item.expires_at ? `Expire le ${new Date(item.expires_at).toLocaleDateString("fr-FR")}` : "Sans échéance"}
                </Text>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 14,
  },
  heroCard: {
    padding: 18,
    gap: 10,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accent.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  heroText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    gap: 10,
    paddingRight: 8,
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
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    color: Colors.ink.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  cardMeta: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.ink.faint,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.accent.dim,
  },
  statusText: {
    fontSize: 11,
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
  cardText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  bottomMeta: {
    fontSize: 11,
    color: Colors.ink.faint,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
});
