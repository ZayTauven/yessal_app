/**
 * Un Daara vu par Sangue Bi, jusqu'au membre : le coordinateur (écrire,
 * appeler), ce que chaque Talubé a donné sur la période, et les derniers Jëfs.
 * Lecture seule.
 */
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MessageSquare, Phone } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { TitleBadge } from "@/components/ui/TitleBadge";
import { formatFCFA, formatNumber } from "@/lib/format";
import { SuiviService } from "@/lib/suivi.service";
import { Font, Ink, Radius, Space, Surface, Violet } from "@/theme";
import { lirePeriode, PERIODES, type SuiviDaara } from "@/types/suivi.types";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function dateCourte(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export default function SuiviDaaraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; periode?: string }>();
  const id = Number(params.id);
  const periode = lirePeriode(params.periode);
  const [data, setData] = useState<SuiviDaara | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tous, setTous] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await SuiviService.getDaara(id, periode));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id, periode]);

  useEffect(() => {
    load();
  }, [load]);

  const membres = data ? (tous ? data.members : data.members.filter((m) => m.amount > 0)) : [];
  const chef = data?.coordinator;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={data ? `Daara ${data.name}` : "Daara"} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load().finally(() => setRefreshing(false));
            }}
            tintColor={Violet[500]}
          />
        }
      >
        {!data && !failed && (
          <View style={{ gap: Space.md }}>
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        )}
        {failed && !data && <ErrorState body="Le Daara n'a pas pu être chargé." onRetry={load} />}

        {data && (
          <>
            <Text style={styles.sub} numberOfLines={1}>
              {data.ldd ? `LDD ${data.ldd.name} · ` : ""}
              {PERIODES.find((p) => p.value === periode)?.label}
            </Text>

            <View style={styles.stats}>
              <View style={[styles.stat, styles.statDark]}>
                <Text style={styles.statLabelDark}>Total</Text>
                <Text style={styles.statValueDark} adjustsFontSizeToFit numberOfLines={1}>{formatNumber(data.amount)}</Text>
                <Text style={styles.statLabelDark}>FCFA</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Jëfs</Text>
                <Text style={styles.statValue}>{formatNumber(data.count)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Talubés</Text>
                <Text style={styles.statValue}>{formatNumber(data.members_count)}</Text>
                <Text style={styles.statLabel}>dont {data.donors_count} donateur{data.donors_count > 1 ? "s" : ""}</Text>
              </View>
            </View>

            <View style={styles.card}>
              {chef ? (
                <View style={styles.coord}>
                  <Avatar uri={chef.avatar} name={chef.name} size={46} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{chef.name}</Text>
                    <Text style={styles.coordTag}>COORDINATION</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push({ pathname: "/chat/new", params: { q: chef.name } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Écrire à ${chef.name}`}
                    style={styles.iconBtn}
                  >
                    <MessageSquare size={19} color={Violet[700]} strokeWidth={1.8} />
                  </Pressable>
                  {!!chef.phone && (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${chef.phone}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Appeler ${chef.name}`}
                      style={styles.iconBtn}
                    >
                      <Phone size={19} color={Violet[700]} strokeWidth={1.8} />
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text style={styles.muted}>Aucun coordinateur nommé pour ce Daara.</Text>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Talubés</Text>
                <Text style={styles.muted}>{tous ? "Tous" : "Ceux qui ont donné"}</Text>
              </View>
              {membres.length === 0 && <Text style={styles.muted}>Aucun Jëf confirmé sur la période.</Text>}
              {membres.map((m) => (
                <View key={m.id} style={styles.row}>
                  <Avatar uri={m.avatar} name={m.name} size={40} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                    {!!m.title && <TitleBadge title={m.title} />}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.amount, !m.amount && { color: Ink[500] }]}>{m.amount ? formatFCFA(m.amount) : "—"}</Text>
                    {m.count > 0 && <Text style={styles.muted}>{m.count} Jëf{m.count > 1 ? "s" : ""}</Text>}
                  </View>
                </View>
              ))}
              {data.members_count > data.donors_count && (
                <Pressable onPress={() => setTous((v) => !v)} accessibilityRole="button" style={styles.more}>
                  <Text style={styles.moreText}>
                    {tous ? "Seulement ceux qui ont donné" : `Voir les ${data.members_count} Talubés du Daara`}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Jëfs du Daara</Text>
                <Text style={styles.muted}>Du plus récent</Text>
              </View>
              {data.donations.length === 0 && <Text style={styles.muted}>Aucun Jëf confirmé sur la période.</Text>}
              {data.donations.map((j) => (
                <View key={j.id} style={styles.row}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{j.donor.name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{j.campaign.name} · {j.method}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.amount}>{formatFCFA(j.amount)}</Text>
                    <Text style={styles.muted}>{dateCourte(j.created_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.alt },
  scroll: { paddingHorizontal: Space.lg, paddingBottom: 48, gap: 12 },
  sub: { fontSize: 12, color: Ink[500], fontFamily: Font.medium },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: Surface.default, gap: 2 },
  statDark: { backgroundColor: Violet[900] },
  statLabel: { fontSize: 11, color: Ink[500], fontFamily: Font.medium },
  statValue: { fontSize: 17, fontFamily: Font.extrabold, color: Violet[900] },
  statLabelDark: { fontSize: 11, color: Violet[200], fontFamily: Font.medium },
  statValueDark: { fontSize: 17, fontFamily: Font.extrabold, color: Surface.default },

  card: { padding: 14, borderRadius: 18, backgroundColor: Surface.default, gap: 4 },
  cardHead: { flexDirection: "row", alignItems: "center", paddingBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontFamily: Font.extrabold, color: Violet[900] },
  coord: { flexDirection: "row", alignItems: "center", gap: Space.md },
  coordTag: {
    alignSelf: "flex-start", marginTop: 3, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 5, overflow: "hidden",
    backgroundColor: Violet[900], color: Surface.default, fontSize: 10, fontFamily: Font.extrabold, letterSpacing: 0.4,
  },
  iconBtn: { width: 44, height: 44, borderRadius: Radius.button, backgroundColor: Violet[100], alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EFEDF3" },
  name: { fontSize: 14, fontFamily: Font.bold, color: Ink[900] },
  amount: { fontSize: 14, fontFamily: Font.extrabold, color: Violet[900] },
  muted: { fontSize: 12, color: Ink[500], fontFamily: Font.regular },
  more: { marginTop: Space.md, minHeight: 46, borderRadius: 14, backgroundColor: Violet[100], alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 14, fontFamily: Font.bold, color: Violet[700] },
});
