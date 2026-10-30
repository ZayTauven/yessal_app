/**
 * L'accueil de Sangue Bi, la guide du Kourel — maquette validée le 2026-10-30.
 *
 * Toute la plateforme d'un coup d'œil : les Jëfs confirmés et ceux qui
 * attendent l'équipe, la part de la diaspora, les Talubés, les Ndiguels, les
 * LDD, les coordinateurs, et un encart « À regarder ». Elle annonce au Kourel
 * d'un geste ; elle ne modifie rien.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, Clock, Megaphone, Menu } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { formatFCFA, formatNumber } from "@/lib/format";
import { SuiviService } from "@/lib/suivi.service";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { Font, GUTTER, Ink, Radius, Space, Surface, Type, Violet } from "@/theme";
import { PERIODES, type Periode, type SuiviNdiguel, type SuiviOverview } from "@/types/suivi.types";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const ALERTE = { bg: "#FFF4E5", ink: "#3A2410", dot: "#B45309", title: "#8A4B00" };

function dateCourte(iso: string) {
  const [, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j} ${MOIS[m - 1]}`;
}

function pluriel(n: number, mot: string) {
  return `${formatNumber(n)} ${mot}${n > 1 ? "s" : ""}`;
}

export function SuiviHome() {
  const router = useRouter();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const user = useAuthStore((s) => s.user);
  const [periode, setPeriode] = useState<Periode>("tout");
  const [data, setData] = useState<SuiviOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: Periode) => {
    try {
      const next = await SuiviService.getSuivi(p);
      setData(next);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load(periode);
  }, [load, periode]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(periode).finally(() => setRefreshing(false));
  }, [load, periode]);

  const annoncer = useCallback(async () => {
    const chat = await SuiviService.getGuideChannel().catch(() => null);
    if (chat) router.push(`/chat/${chat.id}`);
  }, [router]);

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Sangue Bi";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={openDrawer} accessibilityRole="button" accessibilityLabel="Ouvrir le menu" style={styles.round}>
          <Menu size={20} color={Ink[900]} strokeWidth={1.8} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.hello}>Assalamou alaykoum</Text>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
        </View>
        <Avatar uri={user?.avatar} name={name} size={46} />
      </View>

      <View style={styles.periods} accessibilityRole="tablist">
        {PERIODES.map((p) => {
          const on = p.value === periode;
          return (
            <Pressable
              key={p.value}
              onPress={() => setPeriode(p.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.period, on && styles.periodOn]}
            >
              <Text style={[styles.periodText, on && styles.periodTextOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Violet[500]} />}
      >
        {!data && !failed && (
          <View style={{ gap: Space.md }}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        )}
        {failed && !data && <ErrorState body="Le suivi n'a pas pu être chargé." onRetry={() => load(periode)} />}

        {data && (
          <>
            <View style={styles.hero} accessible accessibilityLabel={`Jëfs confirmés : ${formatFCFA(data.donations.amount)}`}>
              <Text style={styles.heroLabel}>Jëfs confirmés · {PERIODES.find((p) => p.value === periode)?.label.toLowerCase()}</Text>
              <Text style={styles.heroAmount} adjustsFontSizeToFit numberOfLines={1}>
                {formatNumber(data.donations.amount)} <Text style={styles.heroCurrency}>FCFA</Text>
              </Text>
              <View style={styles.heroChips}>
                <Text style={styles.chipLight}>{pluriel(data.donations.count, "Jëf")}</Text>
                <Text style={styles.chipDark}>{data.donations.diaspora_pct} % venus de la diaspora</Text>
              </View>
              {data.donations.pending.count > 0 && (
                <View style={styles.heroPending}>
                  <Clock size={15} color={Violet[200]} strokeWidth={1.8} />
                  <Text style={styles.heroPendingText}>
                    {formatFCFA(data.donations.pending.amount)} attendent la confirmation de l&apos;équipe ({pluriel(data.donations.pending.count, "Jëf")})
                  </Text>
                </View>
              )}
            </View>

            <Pressable onPress={annoncer} accessibilityRole="button" style={styles.announce}>
              <Megaphone size={20} color={Surface.default} strokeWidth={1.8} />
              <Text style={styles.announceText}>Annoncer au Kourel</Text>
            </Pressable>

            <View style={styles.grid}>
              <Tile
                label="Talubés"
                value={formatNumber(data.members.total)}
                hint={`${pluriel(data.members.pending, "inscription")} en attente`}
                onPress={() => router.push({ pathname: "/suivi/repartition", params: { par: "titre", periode } })}
              />
              <Tile
                label="Ndiguels en cours"
                value={formatNumber(data.campaigns.active)}
                hint={data.campaigns.upcoming ? `${data.campaigns.upcoming} à venir` : "aucun à venir"}
                onPress={() => router.push("/campaigns")}
              />
              <Tile
                label="LDD qui ont donné"
                value={`${data.ldd.active}`}
                suffix={` / ${data.ldd.total}`}
                hint={data.ldd.top ? `${data.ldd.top} en tête` : "aucune pour l'instant"}
                onPress={() => router.push({ pathname: "/suivi/repartition", params: { par: "ldd", periode } })}
              />
              <Tile
                label="Coordinateurs"
                value={formatNumber(data.coordinators.total)}
                hint={`pour ${formatNumber(data.coordinators.daaras)} Daaras`}
                onPress={() => router.push({ pathname: "/suivi/repartition", params: { par: "daara", periode } })}
              />
            </View>

            {data.alerts.length > 0 && (
              <View style={styles.alerts} accessibilityRole="summary">
                <Text style={styles.alertsTitle}>À REGARDER</Text>
                {data.alerts.map((a) => (
                  <View key={`${a.kind}-${a.strong}`} style={styles.alertRow}>
                    <View style={styles.alertDot} />
                    <Text style={styles.alertText}>
                      <Text style={{ fontFamily: Font.bold }}>{a.strong}</Text>
                      {a.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Section title="Ndiguels" action="Tout voir" onAction={() => router.push("/campaigns")}>
              {data.campaigns_list.length === 0 ? (
                <Text style={styles.muted}>Aucun Ndiguel en cours ni à venir.</Text>
              ) : (
                data.campaigns_list.slice(0, 4).map((n) => <NdiguelRow key={n.id} n={n} />)
              )}
            </Section>

            <Section
              title="Répartition"
              action="Voir"
              onAction={() => router.push({ pathname: "/suivi/repartition", params: { par: "daara", periode } })}
            >
              <Text style={styles.muted}>Par LDD, par Daara, par titre et par pays — jusqu&apos;au Jëf de chaque Talubé.</Text>
            </Section>

            <Section title="Coordinateurs">
              {data.coordinators_list.length === 0 && <Text style={styles.muted}>Aucun coordinateur nommé.</Text>}
              {data.coordinators_list.map((c) => (
                <Pressable
                  key={c.id}
                  disabled={!c.daara}
                  onPress={() => c.daara && router.push({ pathname: "/suivi/daara/[id]", params: { id: String(c.daara.id), periode } })}
                  accessibilityRole="button"
                  style={styles.personRow}
                >
                  <Avatar uri={c.avatar} name={c.name} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.personName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{c.daara ? `Daara ${c.daara.name}` : "Sans Daara"}</Text>
                  </View>
                  <Text style={[styles.personAmount, !c.amount && { color: Ink[500] }]}>
                    {c.amount ? formatFCFA(c.amount) : "—"}
                  </Text>
                  {c.daara && <ChevronRight size={18} color={Ink[300]} />}
                </Pressable>
              ))}
            </Section>

            <Section title="Derniers Jëfs">
              {data.recent.length === 0 && <Text style={styles.muted}>Aucun Jëf confirmé sur la période.</Text>}
              {data.recent.map((j) => (
                <View key={j.id} style={styles.personRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.personName} numberOfLines={1}>{j.donor.name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{j.campaign.name} · {j.method}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.personAmount}>{formatFCFA(j.amount)}</Text>
                    <Text style={styles.muted}>{dateCourte(j.created_at)}</Text>
                  </View>
                </View>
              ))}
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value, suffix, hint, onPress }: { label: string; value: string; suffix?: string; hint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} : ${value}${suffix ?? ""}, ${hint}`} style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>
        {value}
        {suffix && <Text style={styles.tileSuffix}>{suffix}</Text>}
      </Text>
      <Text style={styles.tileHint} numberOfLines={2}>{hint}</Text>
    </Pressable>
  );
}

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
        {action && onAction && (
          <Pressable onPress={onAction} accessibilityRole="link" hitSlop={Space.sm}>
            <Text style={styles.sectionAction}>{action}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function NdiguelRow({ n }: { n: SuiviNdiguel }) {
  const droite =
    n.status === "pending" ? "À venir" : n.pct === null ? formatFCFA(n.collected) : `${n.pct} %`;
  const quand = n.status === "pending" && n.opens_on ? `ouvre le ${dateCourte(n.opens_on)}` : `jusqu'au ${dateCourte(n.deadline)}`;
  return (
    <View style={styles.ndiguel}>
      <View style={styles.ndiguelHead}>
        <Text style={styles.personName} numberOfLines={1}>{n.name}</Text>
        <Text style={styles.ndiguelPct}>{droite}</Text>
      </View>
      {n.pct !== null && <ProgressBar progress={Math.min(n.pct, 100) / 100} />}
      <Text style={styles.muted}>
        {n.goal_amount ? `${formatFCFA(n.collected)} sur ${formatFCFA(n.goal_amount)}` : "Sans objectif chiffré"} · {quand}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.alt },
  header: { flexDirection: "row", alignItems: "center", gap: Space.md, paddingHorizontal: GUTTER, paddingTop: Space.md, paddingBottom: Space.sm },
  round: { width: 44, height: 44, borderRadius: Radius.button, backgroundColor: Surface.default, alignItems: "center", justifyContent: "center" },
  hello: { ...Type.label, color: Ink[500] },
  name: { fontSize: 22, fontFamily: Font.extrabold, color: Violet[900], letterSpacing: -0.4 },

  periods: { flexDirection: "row", gap: 6, marginHorizontal: GUTTER, marginVertical: Space.sm, padding: 4, borderRadius: Radius.chip, backgroundColor: Violet[100] },
  period: { flex: 1, minHeight: 40, borderRadius: Radius.chip, alignItems: "center", justifyContent: "center" },
  periodOn: { backgroundColor: Violet[900] },
  periodText: { fontSize: 13, fontFamily: Font.bold, color: Violet[700] },
  periodTextOn: { color: Surface.default },

  scroll: { paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: 140, gap: Space.md },

  hero: { padding: 18, borderRadius: 22, backgroundColor: Violet[900], gap: 10 },
  heroLabel: { ...Type.label, color: Violet[200] },
  heroAmount: { fontSize: 32, fontFamily: Font.extrabold, color: Surface.default, letterSpacing: -0.8 },
  heroCurrency: { fontSize: 16, color: Violet[200] },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  chipLight: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.chip, overflow: "hidden", backgroundColor: Violet[300], color: Violet[900], fontSize: 12, fontFamily: Font.bold },
  chipDark: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.chip, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.12)", color: Surface.default, fontSize: 12, fontFamily: Font.semibold },
  heroPending: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.16)" },
  heroPendingText: { flex: 1, fontSize: 13, lineHeight: 18, color: "#E1D8F9", fontFamily: Font.medium },

  announce: { minHeight: 52, borderRadius: Radius.button, backgroundColor: Violet[700], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Space.sm },
  announceText: { fontSize: 15, fontFamily: Font.bold, color: Surface.default },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexBasis: "47%", flexGrow: 1, padding: 14, borderRadius: 18, backgroundColor: Surface.default, gap: 4 },
  tileLabel: { fontSize: 12, fontFamily: Font.semibold, color: Ink[500] },
  tileValue: { fontSize: 24, fontFamily: Font.extrabold, color: Violet[900] },
  tileSuffix: { fontSize: 14, fontFamily: Font.semibold, color: Ink[500] },
  tileHint: { fontSize: 12, fontFamily: Font.semibold, color: Violet[700] },

  alerts: { padding: 16, borderRadius: 18, backgroundColor: ALERTE.bg, gap: 10 },
  alertsTitle: { fontSize: 11, fontFamily: Font.extrabold, letterSpacing: 1, color: ALERTE.title },
  alertRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  alertDot: { marginTop: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: ALERTE.dot },
  alertText: { flex: 1, fontSize: 13, lineHeight: 19, color: ALERTE.ink, fontFamily: Font.regular },

  section: { padding: 16, borderRadius: 18, backgroundColor: Surface.default, gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { flex: 1, fontSize: 15, fontFamily: Font.extrabold, color: Violet[900] },
  sectionAction: { fontSize: 13, fontFamily: Font.bold, color: Violet[700] },
  muted: { fontSize: 12, lineHeight: 17, color: Ink[500], fontFamily: Font.regular },

  ndiguel: { gap: 6 },
  ndiguelHead: { flexDirection: "row", alignItems: "baseline", gap: Space.sm },
  ndiguelPct: { marginLeft: "auto", fontSize: 13, fontFamily: Font.bold, color: Violet[700] },

  personRow: { flexDirection: "row", alignItems: "center", gap: Space.md, minHeight: 48 },
  personName: { flexShrink: 1, fontSize: 14, fontFamily: Font.bold, color: Ink[900] },
  personAmount: { fontSize: 14, fontFamily: Font.extrabold, color: Violet[900] },
});
