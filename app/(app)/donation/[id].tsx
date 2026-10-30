/**
 * app/(app)/donation/[id].tsx — le reçu d'un Jëf.
 *
 * Retour terrain du 2026-10-30 : depuis « Mes Jëfs », un appui menait à la
 * page du NDIGUEL — une affiche, un compte à rebours, un bouton « Faire un
 * Jëf ». Le membre venait relire ce qu'il avait donné ; on lui proposait de
 * donner encore. L'écran rend désormais le reçu, sur le gabarit du courriel
 * « Jëf encaissé » (`templates/emails/D9-jef_encaisse.html`) : bandeau violet,
 * filet jaune, montant, puis le tableau des faits.
 *
 * ── Rien d'inventé ──────────────────────────────────────────────────────────
 *
 * Chaque ligne vient de `DonationSerializer` et ne paraît que si le serveur la
 * renseigne : pas de « Collecteur : — » sur un paiement Wave. La référence est
 * celle du courriel (`REF-<id>`), pour qu'un membre qui la cite parle du même
 * Jëf partout.
 *
 * ── Les noms longs ──────────────────────────────────────────────────────────
 *
 * Même leçon que la carte du collecteur : une valeur ne se tronque jamais en
 * silence sur un reçu. L'étiquette garde sa colonne, la valeur passe à la
 * ligne. Un Ndiguel de soixante caractères ou une tutelle à double nom
 * allongent la ligne au lieu de sortir de la carte.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Share2 } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import {
  METHOD_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  isCashJef,
  jefReference,
} from "@/lib/donation-display";
import { formatFCFA } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import type { Donation } from "@/types/donation.types";
import {
  Border,
  Font,
  GUTTER,
  Ink,
  Pastel,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
  montant,
} from "@/theme";

interface State {
  status: "loading" | "ready" | "failed";
  donation: Donation | null;
}

async function fetchDonation(id: number): Promise<State> {
  try {
    return { status: "ready", donation: await ContentService.getDonation(id) };
  } catch {
    return { status: "failed", donation: null };
  }
}

/** « 29 octobre 2026 à 23:44 » — l'heure compte : c'est celle de la remise d'argent. */
function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day} à ${time}`;
}

interface Fact {
  label: string;
  value: string;
  /** Chiffres tabulaires et sélection : une référence se recopie. */
  mono?: boolean;
}

/** Les lignes du reçu, dans l'ordre du courriel, sans aucune ligne vide. */
function receiptFacts(d: Donation, viewerIsDonor: boolean): Fact[] {
  const facts: (Fact | null)[] = [
    { label: "Ndiguel", value: d.campaign_name ?? `Ndiguel n° ${d.campaign}` },
    viewerIsDonor ? null : { label: "Donateur", value: d.donor_name || "—" },
    {
      label: "Au nom de",
      value: d.beneficiary_name ?? (viewerIsDonor ? "En mon nom" : d.donor_name || "—"),
    },
    { label: "Moyen", value: METHOD_LABELS[d.payment_method] ?? d.payment_method },
    { label: "Date du Jëf", value: formatDateTime(d.created_at) ?? "—" },
    d.collector_name
      ? { label: isCashJef(d) && d.collected_at ? "Reçu par" : "Collecteur", value: d.collector_name }
      : null,
    d.collected_at ? { label: "Encaissé le", value: formatDateTime(d.collected_at) ?? "—" } : null,
    d.payment_status === "confirmed" && d.validated_by_name
      ? { label: "Confirmé par", value: d.validated_by_name }
      : null,
    d.payment_status === "confirmed" && d.validated_at
      ? { label: "Confirmé le", value: formatDateTime(d.validated_at) ?? "—" }
      : null,
    { label: "Référence", value: jefReference(d), mono: true },
    d.external_ref?.trim()
      ? { label: "Réf. paiement", value: d.external_ref.trim(), mono: true }
      : d.wire_reference?.trim()
        ? { label: "Réf. virement", value: d.wire_reference.trim(), mono: true }
        : null,
    d.payment_status === "cancelled" && d.cancellation_reason
      ? { label: "Motif", value: d.cancellation_reason }
      : null,
  ];
  return facts.filter((f): f is Fact => f !== null);
}

/** Ce qui va se passer ensuite, dit avec les mots des notifications. */
function nextStep(d: Donation): string | null {
  const collector = d.collector_name || "le collecteur";
  switch (d.payment_status) {
    case "pending":
      if (!isCashJef(d)) return "Le paiement n'est pas encore confirmé par l'opérateur.";
      return d.collector_name
        ? `${d.collector_name} s'occupe de votre Jëf et va vous contacter.`
        : "Un collecteur de votre zone va vous contacter pour récupérer votre Jëf.";
    case "collected":
      return `Votre Jëf sera confirmé dès que ${collector} l'aura remis à l'administration. Vous en serez prévenu.`;
    case "pending_wire":
      return "Votre Jëf sera confirmé dès réception du virement par l'administration.";
    case "failed":
      return "Le paiement a échoué : aucun montant n'a été prélevé.";
    case "cancelled":
      return "Ce Jëf a été annulé par l'administration.";
    default:
      return null;
  }
}

export default function DonationReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const me = useAuthStore((s) => s.user?.id);
  const [state, setState] = useState<State>({ status: "loading", donation: null });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchDonation(id).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchDonation(id)
      .then(setState)
      .finally(() => setRefreshing(false));
  }, [id]);

  const d = state.donation;
  const viewerIsDonor = d != null && d.donor === me;
  const facts = d ? receiptFacts(d, viewerIsDonor) : [];
  const next = d ? nextStep(d) : null;

  /* En texte : il part par WhatsApp, là où le Kourel échange déjà. */
  const share = () => {
    if (!d) return;
    const lines = [
      "Reçu de Jëf — Yessal Gui",
      `Montant : ${formatFCFA(d.amount)}`,
      `Statut : ${STATUS_LABELS[d.payment_status]}`,
      ...facts.map((f) => `${f.label} : ${f.value}`),
    ];
    Share.share({ message: lines.join("\n") }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Reçu de Jëf"
        onBack={() => router.back()}
        right={
          d
            ? {
                icon: <Share2 size={20} color={Ink[900]} strokeWidth={1.5} />,
                accessibilityLabel: "Partager le reçu",
                onPress: share,
              }
            : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Violet[500]} />
        }
      >
        {state.status === "loading" ? (
          <View style={styles.loading}>
            <Skeleton width="100%" height={64} radius={Radius.card} />
            <Skeleton width="60%" height={44} />
            <Skeleton width="100%" height={280} radius={Radius.card} />
          </View>
        ) : null}

        {state.status === "failed" || (state.status === "ready" && !d) ? (
          <ErrorState
            body="Ce reçu n'a pas pu être chargé."
            onRetry={() => {
              setState({ status: "loading", donation: null });
              fetchDonation(id).then(setState);
            }}
          />
        ) : null}

        {d ? (
          <>
            <Card padded={false} style={styles.receipt}>
              {/* Bandeau et filet du courriel : la même pièce, sur l'autre support. */}
              <View style={styles.band}>
                <Text style={styles.bandBrand}>Yessal Gui</Text>
                <Text style={styles.bandKind}>Jëfs</Text>
              </View>
              <View style={styles.strip} />

              <View style={styles.hero}>
                <View style={styles.picto}>
                  <ExpoImage
                    source={require("@/assets/pictos/generosite.png")}
                    style={styles.pictoImage}
                    contentFit="contain"
                  />
                </View>
                <View
                  style={[
                    styles.statusChip,
                    { backgroundColor: `${STATUS_COLORS[d.payment_status]}14` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: STATUS_COLORS[d.payment_status] }]}>
                    {STATUS_LABELS[d.payment_status]}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    /* Même règle que la liste : seul un Jëf confirmé est vert. */
                    d.payment_status !== "confirmed" && styles.amountUnconfirmed,
                  ]}
                  selectable
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {formatFCFA(d.amount)}
                </Text>
                {next ? <Text style={styles.next}>{next}</Text> : null}
              </View>

              <View style={styles.facts}>
                {facts.map((f, i) => (
                  <View
                    key={f.label}
                    style={[styles.fact, i < facts.length - 1 && styles.factDivided]}
                  >
                    <Text style={styles.factLabel}>{f.label}</Text>
                    <Text style={[styles.factValue, f.mono && styles.factMono]} selectable>
                      {f.value}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Text style={styles.footnote}>
              Gardez ce reçu. Il fait foi au même titre que le courriel envoyé à chaque étape.
            </Text>

            {d.campaign ? (
              <Button
                label="Voir le Ndiguel"
                variant="outline"
                onPress={() => router.push(`/campaign/${d.campaign}`)}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: { paddingHorizontal: GUTTER, paddingTop: Space.sm, paddingBottom: 120, gap: Space.lg },
  loading: { gap: Space.lg },

  receipt: { overflow: "hidden" },
  band: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Violet[700],
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
  },
  bandBrand: { ...UIType.rowTitle, color: Surface.default },
  bandKind: { ...Type.label, color: Violet[200] },
  strip: { height: 4, backgroundColor: Pastel.yellow },

  hero: {
    alignItems: "center",
    gap: Space.sm,
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
  },
  picto: {
    width: 72,
    height: 72,
    borderRadius: Radius.card,
    ...continuous,
    backgroundColor: Pastel.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.xs,
  },
  pictoImage: { width: 48, height: 48 },
  statusChip: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radius.chip,
  },
  statusText: { ...UIType.badgeLabel },
  amount: { ...Type.amountHero, fontSize: 38, lineHeight: 44, color: montant },
  amountUnconfirmed: { color: Ink[900] },
  next: { ...Type.label, color: Ink[500], textAlign: "center", maxWidth: 300 },

  facts: {
    marginHorizontal: Space.lg,
    marginBottom: Space.lg,
    paddingHorizontal: Space.lg,
    backgroundColor: Surface.alt,
    borderRadius: Radius.input,
    ...continuous,
  },
  fact: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.lg,
    paddingVertical: Space.md,
  },
  factDivided: { borderBottomWidth: 1, borderBottomColor: Border.hairline },
  /* Assez pour « Réf. paiement », la plus longue étiquette, à 12 px. */
  factLabel: { ...Type.label, color: Ink[500], width: 92 },
  factValue: {
    ...Type.label,
    fontFamily: Font.semibold,
    color: Ink[900],
    flex: 1,
    textAlign: "right",
  },
  factMono: { fontVariant: ["tabular-nums"], letterSpacing: 0.3 },

  footnote: { ...Type.micro, color: Ink[300], textAlign: "center", paddingHorizontal: Space.lg },
});

