/**
 * Répartition des Jëfs pour Sangue Bi : par Daara, par LDD, par titre, par
 * pays. Un onglet = un classement, le plus grand d'abord ; un Daara mène à sa
 * fiche, jusqu'au Jëf de chaque Talubé.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { formatFCFA, formatNumber } from "@/lib/format";
import { SuiviService } from "@/lib/suivi.service";
import { Font, Ink, Radius, Space, Surface, Violet } from "@/theme";
import { lirePeriode, PERIODES, type RepartitionPar, type SuiviRepartition } from "@/types/suivi.types";

const ONGLETS: { value: RepartitionPar; label: string }[] = [
  { value: "daara", label: "Daara" },
  { value: "ldd", label: "LDD" },
  { value: "titre", label: "Titre" },
  { value: "pays", label: "Pays" },
];

function lirePar(v?: string): RepartitionPar {
  return v === "ldd" || v === "titre" || v === "pays" ? v : "daara";
}

function resume(r: SuiviRepartition): { label: string; value: string; note: string } {
  const premier = r.rows[0];
  switch (r.by) {
    case "ldd":
      return {
        label: `${r.rows.length} LDD ont donné`,
        value: formatFCFA(r.total),
        note: r.without_jef ? `${r.without_jef} LDD sans Jëf` : "Toutes les LDD ont donné",
      };
    case "titre": {
      const titres = r.rows.filter((l) => l.id !== null).reduce((n, l) => n + (l.members ?? 0), 0);
      return { label: "Membres titrés", value: formatNumber(titres), note: premier?.amount ? `${premier.name} en tête` : "" };
    }
    case "pays": {
      const sn = r.rows.find((l) => l.name === "Sénégal");
      return { label: "Part de la diaspora", value: `${100 - (sn?.pct ?? 0)} %`, note: premier ? `${premier.name} en tête` : "" };
    }
    default:
      return {
        label: "Daara en tête",
        value: premier?.name ?? "—",
        note: "Touchez un Daara pour voir ses Talubés",
      };
  }
}

export default function RepartitionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ par?: string; periode?: string }>();
  const periode = lirePeriode(params.periode);
  const [par, setPar] = useState<RepartitionPar>(lirePar(params.par));
  const [data, setData] = useState<SuiviRepartition | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: RepartitionPar) => {
    try {
      const next = await SuiviService.getRepartition(p, periode);
      setData(next);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [periode]);

  useEffect(() => {
    load(par);
  }, [load, par]);

  const choisir = (p: RepartitionPar) => {
    if (p === par) return;
    setData(null);
    setPar(p);
  };

  const max = data ? Math.max(...data.rows.map((l) => l.amount), 1) : 1;
  const r = data && data.by === par ? data : null;
  const head = r ? resume(r) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Répartition" onBack={() => router.back()} />
      <Text style={styles.period}>{PERIODES.find((p) => p.value === periode)?.label}</Text>

      <View style={styles.tabs} accessibilityRole="tablist">
        {ONGLETS.map((o) => {
          const on = o.value === par;
          return (
            <Pressable
              key={o.value}
              onPress={() => choisir(o.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {head && (
        <View style={styles.summary}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.summaryLabel}>{head.label}</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{head.value}</Text>
          </View>
          {!!head.note && <Text style={styles.summaryNote}>{head.note}</Text>}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(par).finally(() => setRefreshing(false));
            }}
            tintColor={Violet[500]}
          />
        }
      >
        {!r && !failed && (
          <View style={{ gap: Space.md }}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        )}
        {failed && !r && <ErrorState body="La répartition n'a pas pu être chargée." onRetry={() => load(par)} />}
        {r && r.rows.length === 0 && <Text style={styles.muted}>Aucun Jëf confirmé sur la période.</Text>}
        {r?.rows.map((l, i) => {
          const daara = r.by === "daara" && typeof l.id === "number";
          const sous =
            r.by === "titre"
              ? `${formatNumber(l.members ?? 0)} membre${(l.members ?? 0) > 1 ? "s" : ""}${l.count ? ` · ${l.count} Jëf${l.count > 1 ? "s" : ""}` : ""}`
              : `${l.count} Jëf${l.count > 1 ? "s" : ""} · ${l.pct} %`;
          return (
            <Pressable
              key={`${l.id ?? "aucun"}-${l.name}`}
              disabled={!daara}
              onPress={() => daara && router.push({ pathname: "/suivi/daara/[id]", params: { id: String(l.id), periode } })}
              accessibilityRole={daara ? "button" : undefined}
              style={styles.row}
            >
              <View style={styles.rowHead}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Text style={styles.rowName} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.rowAmount}>{l.amount ? formatFCFA(l.amount) : "—"}</Text>
              </View>
              <View style={styles.rowFoot}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(2, Math.round((l.amount / max) * 100))}%` }]} />
                </View>
                <Text style={styles.rowSub}>{sous}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.alt },
  period: { marginHorizontal: Space.lg, marginTop: -4, fontSize: 12, fontFamily: Font.bold, color: Violet[700] },
  tabs: { flexDirection: "row", gap: 4, marginHorizontal: Space.lg, marginVertical: Space.md, padding: 4, borderRadius: Radius.chip, backgroundColor: Violet[100] },
  tab: { flex: 1, minHeight: 40, borderRadius: Radius.chip, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: Violet[900] },
  tabText: { fontSize: 13, fontFamily: Font.bold, color: Violet[700] },
  tabTextOn: { color: Surface.default },

  summary: { marginHorizontal: Space.lg, padding: 16, borderRadius: 18, backgroundColor: Violet[900], flexDirection: "row", alignItems: "center", gap: Space.md },
  summaryLabel: { fontSize: 12, color: Violet[200], fontFamily: Font.medium },
  summaryValue: { fontSize: 20, fontFamily: Font.extrabold, color: Surface.default },
  summaryNote: { maxWidth: 150, fontSize: 12, lineHeight: 17, color: "#E1D8F9", textAlign: "right", fontFamily: Font.medium },

  list: { margin: Space.lg, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 18, backgroundColor: Surface.default, paddingBottom: 40 },
  muted: { paddingVertical: Space.lg, fontSize: 13, color: Ink[500], fontFamily: Font.regular },
  row: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#EFEDF3", gap: 7 },
  rowHead: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  rank: { width: 20, fontSize: 13, fontFamily: Font.extrabold, color: Violet[300] },
  rowName: { flex: 1, fontSize: 14, fontFamily: Font.bold, color: Ink[900] },
  rowAmount: { fontSize: 14, fontFamily: Font.extrabold, color: Violet[900] },
  rowFoot: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 30 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Violet[100], overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: Violet[500] },
  rowSub: { minWidth: 92, textAlign: "right", fontSize: 12, color: Ink[500], fontFamily: Font.regular },
});
