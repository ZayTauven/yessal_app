import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  Calendar,
  Bell,
  Settings2,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ContentService } from "@/lib/content.service";
import type { EventItem } from "@/types/content.types";

const FALLBACK_EVENTS: EventItem[] = [
  {
    id: 1,
    name: "Grand Magal de Touba",
    description:
      "Célébration du départ d'exil de Cheikh Ahmadou Bamba. Un moment de grâce et de recueillement.",
    cover_image: null,
    event_date: "2024-08-23",
    recurrence: "annual",
    is_date_fixed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media: [],
  },
  {
    id: 2,
    name: "Gamou (Maouloud)",
    description:
      "Célébration de la naissance du Prophète (PSL). Conférences et chants religieux.",
    cover_image: null,
    event_date: "2024-09-15",
    recurrence: "annual",
    is_date_fixed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media: [],
  },
  {
    id: 3,
    name: "Dahira Hebdomadaire",
    description:
      "Rencontre fraternelle pour l'apprentissage et le partage spirituel.",
    cover_image: null,
    event_date: null,
    recurrence: "weekly",
    is_date_fixed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media: [],
  },
];

function formatDate(date?: string | null) {
  if (!date) {
    return "Date à venir";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function recurrenceLabel(value: EventItem["recurrence"]) {
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

export default function EventsTimeline() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>(FALLBACK_EVENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await ContentService.getEvents();
        if (active && data.length > 0) {
          setEvents(data);
        }
      } catch {
        if (active) {
          setEvents(FALLBACK_EVENTS);
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

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Événements"
        subtitle="Vivre la confrérie au quotidien"
        icon={<Calendar size={24} color="#FFF" />}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.accent.DEFAULT} />
            </View>
          ) : null}

          {events.map((event, index) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.connectorWrap}>
                <View style={[styles.dot, index === 0 && styles.dotUrgent]} />
                {index < events.length - 1 && <View style={styles.line} />}
              </View>

              <GlassCard style={styles.eventCard}>
                <ExpoImage
                  source={event.cover_image ? { uri: event.cover_image } : require("@/assets/images/onboarding-1.jpg")}
                  style={styles.eventImage}
                  contentFit="cover"
                />
                <View style={styles.cardContent}>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeText}>{recurrenceLabel(event.recurrence)}</Text>
                  </View>

                  <Text style={styles.eventTitle}>{event.name}</Text>

                  <View style={styles.infoRow}>
                    <Clock size={14} color={Colors.ink.faint} />
                    <Text style={styles.infoText}>{formatDate(event.event_date)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MapPin size={14} color={Colors.ink.faint} />
                    <Text style={styles.infoText}>
                      {event.is_date_fixed ? "Date fixe" : "Date variable"}
                    </Text>
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {event.description}
                  </Text>

                  <Pressable style={styles.detailsBtn} hitSlop={10} onPress={() => router.push("/campaigns" as any)}>
                    <Text style={styles.detailsText}>Voir les détails</Text>
                    <ChevronRight size={16} color={Colors.accent.DEFAULT} />
                  </Pressable>
                </View>
              </GlassCard>
            </View>
          ))}
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
    zIndex: 2,
  },
  scroll: {
    paddingBottom: 180,
    paddingTop: 16,
  },
  loadingCard: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 16,
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
    marginTop: 20,
    zIndex: 2,
  },
  dotUrgent: {
    backgroundColor: Colors.status.error,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(26, 92, 58, 0.1)",
    marginVertical: -10,
  },
  eventCard: {
    flex: 1,
    marginBottom: 28,
    padding: 0,
    overflow: "hidden",
  },
  eventImage: {
    width: "100%",
    height: 124,
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface.muted,
  },
  typeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
    textTransform: "uppercase",
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  detailsText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
});
