import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import {
  Calendar,
  Bell,
  Star,
  ChevronRight,
  RefreshCw,
  Repeat,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import type { EventItem } from "@/types/content.types";

// ─── Données de secours (fêtes bien connues de la confrérie) ─────────────────
const FALLBACK_FETES: EventItem[] = [
  {
    id: 1,
    name: "Grand Magal de Touba",
    description:
      "Célébration du départ d'exil de Cheikh Ahmadou Bamba. Chaque Ndiguel lié au Magal contribue à cet événement fondateur.",
    cover_image: null,
    event_date: null,
    recurrence: "annual",
    is_date_fixed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media: [],
  },
  {
    id: 2,
    name: "Gamou (Maouloud)",
    description:
      "Célébration de la naissance du Prophète (PSL). Conférences et chants religieux organisés par le Daara.",
    cover_image: null,
    event_date: null,
    recurrence: "annual",
    is_date_fixed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media: [],
  },
  {
    id: 3,
    name: "Dahira Hebdomadaire",
    description:
      "Rencontre fraternelle pour l'apprentissage et le partage spirituel. Récurrence hebdomadaire, contribuant régulièrement à la caisse du Daara.",
    cover_image: null,
    event_date: null,
    recurrence: "weekly",
    is_date_fixed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(date?: string | null) {
  if (!date) return "Date à venir";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isUpcoming(date?: string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // dans les 30 prochains jours
}

function recurrenceLabel(value: EventItem["recurrence"]): string {
  switch (value) {
    case "annual":
      return "Annuel";
    case "quarterly":
      return "Trimestriel";
    case "weekly":
      return "Hebdomadaire";
    default:
      return "Ponctuel";
  }
}

function RecurrenceIcon({ value }: { value: EventItem["recurrence"] }) {
  const color = Colors.accent.DEFAULT;
  if (value === "weekly") return <Repeat size={12} color={color} />;
  if (value === "annual") return <RefreshCw size={12} color={color} />;
  return <Star size={12} color={color} />;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function FetesScreen() {
  const router = useRouter();
  const [fetes, setFetes] = useState<EventItem[]>(FALLBACK_FETES);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await ContentService.getEvents(); // → GET /api/events/fetes/
        if (active) {
          setFetes(data.length > 0 ? data : FALLBACK_FETES);
          setUsingFallback(data.length === 0);
        }
      } catch {
        if (active) {
          setFetes(FALLBACK_FETES);
          setUsingFallback(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Fêtes"
        subtitle="Calendrier des événements religieux"
        icon={<Calendar size={24} color="#FFF" />}
        actions={[
          {
            label: "Notifications",
            icon: <Bell size={18} color={Colors.ink.DEFAULT} />,
            onPress: () => router.push("/notifications" as any),
          },
        ]}
      />

      <View style={styles.content}>
        {/* Bandeau explicatif */}
        <View style={styles.infoBanner}>
          <Star size={14} color={Colors.accent.DEFAULT} />
          <Text style={styles.infoText}>
            {"Les fêtes sont liées aux Ndiguels. L'admin met à jour les dates → vous recevrez une notification Push."}
          </Text>
        </View>

        {usingFallback && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Mode hors-ligne — données de référence affichées</Text>
          </View>
        )}

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
              <Text style={styles.loadingText}>Chargement des fêtes…</Text>
            </View>
          ) : null}

          {!loading &&
            fetes.map((fete, index) => {
              const upcoming = isUpcoming(fete.event_date);
              return (
                <View key={fete.id} style={styles.timelineItem}>
                  {/* Connecteur timeline */}
                  <View style={styles.connectorWrap}>
                    <View
                      style={[
                        styles.dot,
                        upcoming && styles.dotUpcoming,
                        index === 0 && styles.dotFirst,
                      ]}
                    />
                    {index < fetes.length - 1 && <View style={styles.line} />}
                  </View>

                  <GlassCard style={styles.feteCard}>
                    {/* En-tête */}
                    <View style={styles.cardHeader}>
                      <View style={styles.recurrenceTag}>
                        <RecurrenceIcon value={fete.recurrence} />
                        <Text style={styles.recurrenceText}>
                          {recurrenceLabel(fete.recurrence)}
                        </Text>
                      </View>
                      {upcoming && (
                        <View style={styles.upcomingBadge}>
                          <Bell size={10} color="#FFF" />
                          <Text style={styles.upcomingText}>Bientôt</Text>
                        </View>
                      )}
                    </View>

                    {/* Nom de la fête */}
                    <Text style={styles.feteName}>{fete.name}</Text>

                    {/* Date */}
                    <View style={styles.dateRow}>
                      <Calendar size={14} color={Colors.accent.DEFAULT} />
                      <Text
                        style={[
                          styles.dateText,
                          upcoming && styles.dateTextUrgent,
                        ]}
                      >
                        {formatDate(fete.event_date)}
                      </Text>
                    </View>

                    {/* Description */}
                    {fete.description ? (
                      <Text style={styles.description} numberOfLines={3}>
                        {fete.description}
                      </Text>
                    ) : null}

                    {/* Lien vers le détail de la fête */}
                    <Pressable
                      style={styles.ndiguelsBtn}
                      hitSlop={10}
                      onPress={() => router.push(`/event/${fete.id}` as any)}
                    >
                      <Text style={styles.ndiguelsText}>
                        Voir le détail
                      </Text>
                      <ChevronRight size={16} color={Colors.accent.DEFAULT} />
                    </Pressable>
                  </GlassCard>
                </View>
              );
            })}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(26, 92, 58, 0.06)",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    lineHeight: 18,
  },
  offlineBadge: {
    backgroundColor: "rgba(220, 150, 0, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#b07a00",
    textAlign: "center",
  },
  scroll: {
    paddingBottom: 180,
    paddingTop: 12,
  },
  loadingCard: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.faint,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 0,
  },
  connectorWrap: {
    width: 20,
    alignItems: "center",
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accent.light,
    borderWidth: 3,
    borderColor: "#FFF",
    marginTop: 22,
    zIndex: 2,
  },
  dotFirst: {
    backgroundColor: Colors.accent.DEFAULT,
  },
  dotUpcoming: {
    backgroundColor: "#e07b00",
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(26, 92, 58, 0.1)",
    marginVertical: -4,
  },
  feteCard: {
    flex: 1,
    marginBottom: 24,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recurrenceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface.muted,
  },
  recurrenceText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    textTransform: "uppercase",
  },
  upcomingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e07b00",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  upcomingText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    textTransform: "uppercase",
  },
  feteName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    letterSpacing: -0.4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_600SemiBold",
  },
  dateTextUrgent: {
    color: "#e07b00",
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  ndiguelsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(26, 92, 58, 0.08)",
  },
  ndiguelsText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
});
