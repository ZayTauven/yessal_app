/**
 * Le podium des donateurs — le « Top 10 » que Sangue Bi annonce au Kourel.
 * Remplace la section « Coordinateurs », jugée sans intérêt par le porteur
 * (2026-11-01) ; même contenu que `dashboard/suivi/PodiumCard.tsx` sur le web.
 *
 * Semaine depuis lundi, mois depuis le 1er, année depuis le 1er janvier, à
 * l'heure de Dakar : le serveur fixe les bornes. Ces périodes ne sont pas
 * celles du reste de l'accueil (« Ce mois », « 3 mois »…) : le podium a donc
 * son propre sélecteur.
 *
 * Un donateur qui a fait un Jëf anonyme dans la période porte l'étiquette
 * « Anonyme » : la guide voit son nom, elle ne doit pas le citer.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";

import { AnonymeBadge } from "@/components/ui/AnonymeBadge";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { TitleBadge } from "@/components/ui/TitleBadge";
import { formatFCFA } from "@/lib/format";
import { SuiviService } from "@/lib/suivi.service";
import { Border, Font, Ink, Radius, Space, Surface, Violet } from "@/theme";
import type { PodiumPeriode, SuiviPodium, SuiviPodiumLigne } from "@/types/suivi.types";

import { CouronneLaurier, Medaille, metalDuRang, type Metal } from "./Medaille";

const ONGLETS: { value: PodiumPeriode; label: string }[] = [
  { value: "semaine", label: "Semaine" },
  { value: "mois", label: "Mois" },
  { value: "annee", label: "Année" },
];

/* Un voile du métal derrière la ligne, comme sur le web. */
const VOILE: Record<Metal, string> = {
  or: "rgba(232, 182, 63, 0.16)",
  argent: "rgba(160, 168, 180, 0.16)",
  bronze: "rgba(196, 120, 64, 0.16)",
};

const VIDE: Record<PodiumPeriode, string> = {
  semaine: "Aucun Jëf confirmé depuis lundi.",
  mois: "Aucun Jëf confirmé ce mois-ci.",
  annee: "Aucun Jëf confirmé cette année.",
};

/** `refreshKey` change à chaque « tirer pour rafraîchir » de l'accueil. */
export function PodiumCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [periode, setPeriode] = useState<PodiumPeriode>("semaine");
  const [donnees, setDonnees] = useState<Partial<Record<PodiumPeriode, SuiviPodium>>>({});
  const [failed, setFailed] = useState(false);
  /* La dernière période demandée : une réponse lente d'un onglet quitté
     n'écrase pas l'erreur ou le chargement de l'onglet courant. */
  const demandee = useRef(periode);

  /** `oublier` : un rafraîchissement jette les autres périodes, relues quand on y reviendra. */
  const charger = useCallback(async (p: PodiumPeriode, oublier = false) => {
    demandee.current = p;
    try {
      const res = await SuiviService.getPodium(p);
      setDonnees((d) => (oublier ? { [p]: res } : { ...d, [p]: res }));
      if (demandee.current === p) setFailed(false);
    } catch {
      if (demandee.current === p) setFailed(true);
    }
  }, []);

  useEffect(() => {
    charger(demandee.current, true);
  }, [charger, refreshKey]);

  const choisir = (suivante: PodiumPeriode) => {
    setPeriode(suivante);
    setFailed(false);
    if (donnees[suivante]) {
      demandee.current = suivante;
      return;
    }
    charger(suivante);
  };

  const reessayer = () => {
    setFailed(false);
    charger(periode);
  };

  const p = donnees[periode];

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Top 10 des donateurs
      </Text>

      <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Période du podium">
        {ONGLETS.map((o) => {
          const on = o.value === periode;
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

      {failed && !p ? (
        <Pressable onPress={reessayer} accessibilityRole="button">
          <Text style={styles.muted}>
            Le podium n&apos;a pas pu être chargé. <Text style={styles.retry}>Réessayer</Text>
          </Text>
        </Pressable>
      ) : null}
      {!failed && !p ? (
        <View style={{ gap: Space.sm }}>
          <SkeletonListRow />
          <SkeletonListRow />
        </View>
      ) : null}
      {p && p.rows.length === 0 ? <Text style={styles.muted}>{VIDE[periode]}</Text> : null}
      {p && p.rows.length > 0 ? (
        <View>
          {p.rows.map((d, i) => (
            <Ligne key={d.id} d={d} divided={i < p.rows.length - 1} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Ligne({ d, divided }: { d: SuiviPodiumLigne; divided: boolean }) {
  const router = useRouter();
  const metal = metalDuRang(d.rank);
  const daara = d.daara;

  return (
    <Pressable
      disabled={!daara}
      onPress={() => daara && router.push({ pathname: "/suivi/daara/[id]", params: { id: String(daara.id) } })}
      accessibilityRole={daara ? "button" : undefined}
      accessibilityLabel={`Rang ${d.rank}, ${d.name}${d.anonymous ? ", anonyme : ne pas citer" : ""}, ${formatFCFA(d.amount)}`}
      style={[styles.row, metal ? styles.rowMetal : divided && styles.rowDivided]}
    >
      {metal ? (
        <LinearGradient
          colors={[VOILE[metal], "rgba(255,255,255,0)"]}
          locations={[0, 0.7]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {metal ? (
        <Medaille metal={metal} rang={d.rank} />
      ) : (
        <View style={styles.rank}>
          <Text style={styles.rankText}>{d.rank}</Text>
        </View>
      )}

      {metal ? (
        <CouronneLaurier metal={metal} taille={50}>
          <Avatar uri={d.avatar} name={d.name} size={32} />
        </CouronneLaurier>
      ) : (
        <View style={styles.avatarSlot}>
          <Avatar uri={d.avatar} name={d.name} size={32} />
        </View>
      )}

      <View style={styles.text}>
        {/* Les étiquettes passent à la ligne plutôt que d'écraser le nom. Deux
            lignes : à 375 px, la médaille, la couronne et le montant laissent
            ~90 px au nom, et trois « Souleyman… » ne se distinguaient plus —
            c'est cette liste que Sangue Bi lit au Kourel. */}
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={2}>
            {d.name}
          </Text>
          <TitleBadge title={d.title} />
          {d.anonymous ? <AnonymeBadge /> : null}
        </View>
        <Text style={styles.muted} numberOfLines={1}>
          {daara ? `Daara ${daara.name}` : "Sans Daara"} · {d.count} Jëf{d.count > 1 ? "s" : ""}
        </Text>
      </View>

      <Text style={styles.amount}>{formatFCFA(d.amount)}</Text>
      {daara ? <ChevronRight size={16} color={Ink[300]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 18, backgroundColor: Surface.default, gap: 12 },
  title: { fontSize: 15, fontFamily: Font.extrabold, color: Violet[900] },

  tabs: { flexDirection: "row", gap: 4, padding: 3, borderRadius: Radius.chip, backgroundColor: Violet[100] },
  tab: { flex: 1, minHeight: 34, borderRadius: Radius.chip, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: Violet[900] },
  tabText: { fontSize: 12, fontFamily: Font.bold, color: Violet[700] },
  tabTextOn: { color: Surface.default },

  muted: { fontSize: 12, lineHeight: 17, color: Ink[500], fontFamily: Font.regular },
  retry: { fontFamily: Font.bold, color: Violet[700] },

  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 8 },
  rowDivided: { borderBottomWidth: 1, borderBottomColor: Border.hairline },
  /* Le voile déborde un peu de la colonne, comme sur le web (-mx-2 px-2). */
  rowMetal: { marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12, overflow: "hidden", marginBottom: 2 },

  rank: {
    width: 26,
    height: 22,
    borderRadius: Radius.chip,
    backgroundColor: Surface.btn,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 11, fontFamily: Font.bold, color: Ink[500], fontVariant: ["tabular-nums"] },
  avatarSlot: { width: 50, alignItems: "center" },

  text: { flex: 1, minWidth: 0, gap: 2 },
  nameLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 2 },
  name: { flexShrink: 1, maxWidth: "100%", fontSize: 14, fontFamily: Font.bold, color: Ink[900] },
  amount: { fontSize: 14, fontFamily: Font.extrabold, color: Violet[900], fontVariant: ["tabular-nums"] },
});
