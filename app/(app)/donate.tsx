/**
 * app/(app)/donate.tsx — la feuille du Jëf.
 *
 * Écrans 3, 4 et 5 de la planche « Faire un Jëf » : le montant au pavé, le
 * moyen de paiement, la confirmation. Les écrans 1 et 2 sont des routes à part
 * entière — la liste des Ndiguels et sa fiche.
 *
 * ── Pourquoi une route et non trois ─────────────────────────────────────────
 *
 * La phase C a fait de `donate` une feuille pleine hauteur
 * (`sheetAllowedDetents: [1]`). Trois routes empilées DANS une feuille
 * demanderaient un navigateur imbriqué, et chaque poussée ferait glisser une
 * feuille par-dessus une feuille. Les trois écrans sont donc trois ÉTATS d'une
 * même route. Conséquence voulue : le bouton système et le geste de fermeture
 * referment tout le flux, ce qui est le bon geste — on n'abandonne pas un
 * paiement à moitié.
 *
 * Le retour de la première étape ferme la feuille ; celui des suivantes revient
 * d'un pas.
 *
 * ── Ce que la planche ne montre pas, et qui ne pouvait pas disparaître ──────
 *
 * **Le mode collecte.** Un collecteur, un chef de Daara ou un administrateur
 * enregistre un Jëf en espèces AU NOM d'un membre, sur le terrain. La planche
 * ne dessine que le parcours du talibé ; retirer la collecte aurait supprimé
 * une fonction du produit sous couvert de refonte. Elle vit sur l'étape du
 * moyen de paiement, là où elle a du sens : c'est un moyen de paiement.
 *
 * ── Une honnêteté que la planche ne pouvait pas connaître ───────────────────
 *
 * La planche titre l'écran 5 « Jëf confirmé ». Ce n'est vrai que pour un
 * paiement abouti. Un virement est *déclaré*, une collecte est *enregistrée*,
 * une demande Wave attend une validation sur le téléphone. Le titre suit donc
 * ce qui s'est réellement passé. Le remerciement, lui, est vrai dans tous les
 * cas — « Jërëjëf » reste.
 *
 * Même règle pour la RÉFÉRENCE : la planche affiche « YG-26-0K4M18 », un code
 * inventé pour la démonstration. On montre ce que le serveur renvoie, et à
 * défaut le numéro du don. Fabriquer une référence que le back ne connaît pas,
 * c'est donner à l'utilisateur un numéro à citer que personne ne saura lire.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextStyle,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronLeft, Copy, Search, UserCheck } from "lucide-react-native";

import { AmountSelector } from "@/components/donation/AmountSelector";
import { NumericKeypad } from "@/components/donation/NumericKeypad";
import {
  PAYMENT_METHODS,
  PaymentMethodRow,
} from "@/components/donation/PaymentMethodRow";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import { formatFCFA, formatNumber } from "@/lib/format";
import { canCollect } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";
import type { Campaign } from "@/types/campaign.types";
import type { Tutelle } from "@/types/content.types";
import type { BankAccount, Donation, PaymentMethod } from "@/types/donation.types";
import {
  Border,
  Font,
  GUTTER,
  HIT,
  Ink,
  Pastel,
  Radius,
  Space,
  Status,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
  montant,
} from "@/theme";

/** Le plancher du produit — la planche le dit, le bouton s'y tient. */
const MIN_JEF = 500;
/** Le plafond. Au-delà, la frappe est REFUSÉE, pas tronquée en silence. */
const MAX_JEF = 2_000_000;
/** 2 000 000 tient sur sept chiffres. */
const MAX_DIGITS = String(MAX_JEF).length;
/**
 * Hauteur d'une touche du pavé. 64 dans une feuille plutôt que les 72 du
 * contrat — et 56 sur un écran court.
 *
 * Le calcul qui l'impose : en-tête 44 + montant héros et montants rapides ~190
 * + indication 18 + ligne de tutelle 72 + pavé (4 rangées) + bouton 52 +
 * marges ~60. À 64, le pavé fait 4 × 64 + 3 × 8 = 280, et le total atteint
 * ~716 — confortable sur 844, **au-delà des 667 d'un iPhone SE**. D'où les deux
 * précautions : cette réduction, et le fait que tout ce qui précède le pavé
 * vive dans une zone qui défile.
 */
const KEY_HEIGHT_SHORT = 56;
const KEY_HEIGHT = 64;
/** En dessous, l'écran est « court » au sens ci-dessus. */
const SHORT_SCREEN = 720;
/** Assez de membres pour choisir, pas assez pour faire défiler sans fin. */
const MEMBER_LIMIT = 20;

/** Même précaution que dans `theme/tokens.ts` : mutable, sinon l'inférence casse. */
const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

type Step = "amount" | "method" | "wire" | "done";

interface DirectoryUser {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
}

function memberName(m: DirectoryUser): string {
  const full = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
  return m.name?.trim() || full || "Membre";
}

function parseId(value?: string | string[]): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

interface LoadState {
  status: "loading" | "ready" | "failed";
  campaigns: Campaign[];
  tutelles: Tutelle[];
}

/** ⚠ Pas de `as const` : il figerait les tableaux en `readonly`. */
const EMPTY: Omit<LoadState, "status"> = { campaigns: [], tutelles: [] };

/**
 * Les deux appels partent ensemble. L'échec des TUTELLES n'est pas fatal —
 * on peut faire un Jëf pour soi-même ; celui des Ndiguels l'est, il n'y a plus
 * rien à financer.
 */
async function fetchDonate(): Promise<LoadState> {
  const [campaigns, tutelles] = await Promise.all([
    ContentService.getCampaigns().catch(() => null),
    ContentService.getTutelles().catch(() => [] as Tutelle[]),
  ]);
  if (!campaigns) return { status: "failed", ...EMPTY };
  return { status: "ready", campaigns, tutelles };
}

/** Ce qui reste à faire après la création du don, par moyen de paiement. */
interface Receipt {
  donation: Donation;
  title: string;
  body: string;
}

export default function DonateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    campaignId?: string | string[];
    beneficiary?: string | string[];
  }>();
  const { height } = useWindowDimensions();
  const { user } = useAuthStore();
  const collector = canCollect(user?.role);

  const [data, setData] = useState<LoadState>({ status: "loading", ...EMPTY });
  const [step, setStep] = useState<Step>("amount");

  /**
   * Le bénéficiaire a TROIS états, pas deux, et c'est ce qui évite un effet de
   * présélection : `undefined` = l'utilisateur n'a rien dit, on suit le
   * paramètre de route ; `null` = il a explicitement décoché ; un nombre = il a
   * choisi. Un simple `number | null` aurait confondu « pas encore décidé » et
   * « décoché », et il aurait fallu un effet pour les distinguer — exactement
   * le `setState` synchrone que le React Compiler refuse.
   *
   * Le Ndiguel, lui, n'a pas d'état du tout : il vient de l'écran précédent et
   * cette feuille ne permet pas d'en changer. Il se DÉDUIT.
   */
  const [beneficiaryChoice, setBeneficiaryChoice] = useState<number | null | undefined>(
    undefined,
  );

  /**
   * Le montant vit en CHAÎNE DE CHIFFRES, pas en nombre : c'est ce que le pavé
   * manipule, et une conversion aller-retour perdrait un zéro de tête pendant
   * la frappe. Le nombre s'en déduit.
   */
  const [digits, setDigits] = useState("");
  /** Vrai le temps d'une frappe refusée — c'est ce qui allume l'avertissement. */
  const [refused, setRefused] = useState(false);

  const [method, setMethod] = useState<PaymentMethod>("orange_money");
  const [wireRef, setWireRef] = useState("");

  const [collectMode, setCollectMode] = useState(false);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [memberQuery, setMemberQuery] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = useCallback(() => {
    setData((previous) => ({ ...previous, status: "loading" }));
    fetchDonate().then(setData);
  }, []);

  useEffect(() => {
    let active = true;
    fetchDonate().then((next) => {
      if (active) setData(next);
    });
    return () => {
      active = false;
    };
  }, []);

  /** L'annuaire n'est chargé que si un collecteur bascule en mode collecte. */
  useEffect(() => {
    if (!collectMode || directory.length > 0) return;
    let active = true;
    ContentService.getDirectory()
      .then((rows) => {
        if (active) setDirectory(rows as DirectoryUser[]);
      })
      .catch(() => {
        if (active) setDirectory([]);
      });
    return () => {
      active = false;
    };
  }, [collectMode, directory.length]);

  /** Celui que la route désigne, à défaut le premier ouvert, à défaut le premier. */
  const campaign = useMemo(() => {
    const wanted = parseId(params.campaignId);
    return (
      data.campaigns.find((c) => c.id === wanted) ??
      data.campaigns.find((c) => c.status === "active") ??
      data.campaigns[0] ??
      null
    );
  }, [data.campaigns, params.campaignId]);

  const beneficiaryId =
    beneficiaryChoice === undefined
      ? (data.tutelles.find((t) => t.id === parseId(params.beneficiary))?.id ?? null)
      : beneficiaryChoice;
  const beneficiary = data.tutelles.find((t) => t.id === beneficiaryId) ?? null;
  /** La tutelle proposée quand aucune n'est cochée : la première, s'il y en a une. */
  const firstTutelle = data.tutelles[0] ?? null;
  const member = directory.find((m) => m.id === memberId) ?? null;

  const amount = Number(digits) || 0;
  const valid = amount >= MIN_JEF && amount <= MAX_JEF;

  const members = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const rows = q
      ? directory.filter((m) => memberName(m).toLowerCase().includes(q))
      : directory;
    return rows.slice(0, MEMBER_LIMIT);
  }, [directory, memberQuery]);

  /**
   * Le pavé propose plus de chiffres que le plafond n'en autorise : c'est ici
   * que la frappe est refusée. Rendre `maxLength` égal au nombre de chiffres
   * du plafond ne suffirait pas — « 9 999 999 » y tient aussi.
   */
  const onDigits = useCallback((next: string) => {
    if (Number(next) > MAX_JEF) {
      setRefused(true);
      return;
    }
    setRefused(false);
    setDigits(next);
  }, []);

  const chooseQuick = useCallback((value: number) => {
    setRefused(false);
    setDigits(String(value));
  }, []);

  const goBack = useCallback(() => {
    if (step === "wire") return setStep("method");
    if (step === "method") return setStep("amount");
    router.dismiss();
  }, [router, step]);

  const submit = useCallback(async () => {
    if (!campaign || !valid || submitting) return;

    if (campaign.status !== "active") {
      Alert.alert(
        "Ndiguel clôturé",
        "Ce Ndiguel n'accepte plus de Jëf. Choisissez-en un autre.",
      );
      return;
    }
    if (collectMode && !memberId) {
      Alert.alert(
        "Membre requis",
        "Choisissez le membre pour lequel vous enregistrez cette collecte.",
      );
      return;
    }
    if (method === "virement" && !wireRef.trim()) {
      Alert.alert(
        "Référence requise",
        "Saisissez la référence de votre virement pour qu'il soit rapproché.",
      );
      return;
    }

    const effective: PaymentMethod = collectMode ? "manual" : method;
    setSubmitting(true);
    try {
      const donation = await ContentService.createDonation({
        campaign: campaign.id,
        amount,
        payment_method: effective,
        beneficiary: collectMode ? null : beneficiaryId,
        external_ref: effective === "virement" ? wireRef.trim() : null,
        ...(collectMode && memberId ? { member_id: memberId } : {}),
      } as Parameters<typeof ContentService.createDonation>[0]);

      /*
        Les espèces ne passent pas par l'endpoint de paiement : il n'y a rien à
        initier, le collecteur encaisse et un responsable valide ensuite.
      */
      if (effective === "manual") {
        setReceipt({
          donation,
          title: collectMode ? "Collecte enregistrée" : "Jëf enregistré",
          body: collectMode
            ? `La contribution de ${formatFCFA(amount)}${member ? ` au nom de ${memberName(member)}` : ""} est enregistrée. Elle sera validée par un responsable.`
            : "Un collecteur de votre Daara viendra récupérer votre contribution.",
        });
        setStep("done");
        return;
      }

      const result = await ContentService.payDonation(
        donation.id,
        effective,
        effective === "virement" ? wireRef.trim() : undefined,
      );

      if (effective === "virement") {
        setReceipt({
          donation,
          title: "Virement déclaré",
          body: "Votre déclaration est reçue. Le Jëf sera validé dès réception des fonds.",
        });
        setStep("done");
        return;
      }

      if (effective === "bictorys") {
        const checkout = (result as { checkout_url?: string })?.checkout_url;
        if (checkout) {
          const { Linking } = await import("react-native");
          await Linking.openURL(checkout);
        }
        setReceipt({
          donation,
          title: "Paiement ouvert",
          body: checkout
            ? "Terminez le paiement sur la page sécurisée qui vient de s'ouvrir."
            : "La page de paiement n'a pas pu s'ouvrir. Votre Jëf est enregistré et reste à régler.",
        });
        setStep("done");
        return;
      }

      setReceipt({
        donation,
        title: "Jëf initié",
        body: `Une demande ${effective === "wave" ? "Wave" : "Orange Money"} vient de partir. Validez-la sur votre téléphone.`,
      });
      setStep("done");
    } catch (error) {
      Alert.alert(
        "Le Jëf n'a pas pu être envoyé",
        error instanceof Error ? error.message : "Réessayez dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    amount,
    beneficiaryId,
    campaign,
    collectMode,
    member,
    memberId,
    method,
    submitting,
    valid,
    wireRef,
  ]);

  const padding = {
    paddingTop: Space.sm,
    paddingBottom: Math.max(insets.bottom, Space.xl),
  };

  if (data.status === "failed") {
    return (
      <View style={[styles.sheet, styles.centered, padding]}>
        <ErrorState
          body="Les Ndiguels n'ont pas pu être chargés."
          onRetry={load}
        />
      </View>
    );
  }

  if (data.status === "loading") {
    return (
      <View style={[styles.sheet, padding]}>
        <Header title="Montant" onBack={goBack} />
        <View style={styles.loading}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={44} />
          <Skeleton width="100%" height={96} radius={Radius.card} />
        </View>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={[styles.sheet, styles.centered, padding]}>
        <EmptyState
          title="Aucun Ndiguel ouvert"
          body="Il n'y a pas d'appel en cours pour l'instant. Revenez bientôt."
        />
      </View>
    );
  }

  return (
    <View style={[styles.sheet, padding]}>
      {step === "amount" ? (
        <AmountStep
          keyHeight={height < SHORT_SCREEN ? KEY_HEIGHT_SHORT : KEY_HEIGHT}
          campaign={campaign}
          digits={digits}
          amount={amount}
          refused={refused}
          valid={valid}
          beneficiary={beneficiary ?? firstTutelle}
          beneficiaryOn={beneficiaryId !== null}
          onToggleBeneficiary={() =>
            setBeneficiaryChoice(beneficiaryId === null ? (firstTutelle?.id ?? null) : null)
          }
          onDigits={onDigits}
          onQuick={chooseQuick}
          onBack={goBack}
          onNext={() => setStep("method")}
        />
      ) : null}

      {step === "method" ? (
        <MethodStep
          amount={amount}
          method={method}
          collector={collector}
          collectMode={collectMode}
          members={members}
          memberId={memberId}
          memberQuery={memberQuery}
          email={user?.email ?? null}
          submitting={submitting}
          onBack={goBack}
          onEditAmount={() => setStep("amount")}
          onMethod={(next) =>
            next === "virement" ? (setMethod(next), setStep("wire")) : setMethod(next)
          }
          onToggleCollect={() => {
            setCollectMode((on) => !on);
            setMemberId(null);
          }}
          onMemberQuery={setMemberQuery}
          onMember={setMemberId}
          onSubmit={submit}
        />
      ) : null}

      {step === "wire" ? (
        <WireStep
          amount={amount}
          value={wireRef}
          onChange={setWireRef}
          onBack={goBack}
          onDone={() => setStep("method")}
        />
      ) : null}

      {step === "done" && receipt ? (
        <DoneStep
          receipt={receipt}
          amount={amount}
          campaign={campaign}
          beneficiaryLabel={
            collectMode && member
              ? memberName(member)
              : beneficiary
                ? `${beneficiary.first_name} ${beneficiary.last_name}`.trim()
                : "Vous-même"
          }
          methodLabel={
            PAYMENT_METHODS.find((m) => m.value === (collectMode ? "manual" : method))
              ?.label ?? "—"
          }
          onCampaigns={() => router.dismissTo("/campaigns")}
          onDonations={() => router.dismissTo("/donations")}
        />
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton
          icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel="Revenir"
          onPress={onBack}
        />
      ) : (
        <View style={styles.headerSlot} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSlot} />
    </View>
  );
}

interface AmountStepProps {
  keyHeight: number;
  campaign: Campaign;
  digits: string;
  amount: number;
  refused: boolean;
  valid: boolean;
  beneficiary: Tutelle | null;
  beneficiaryOn: boolean;
  onToggleBeneficiary: () => void;
  onDigits: (next: string) => void;
  onQuick: (value: number) => void;
  onBack: () => void;
  onNext: () => void;
}

function AmountStep({
  keyHeight,
  campaign,
  digits,
  amount,
  refused,
  valid,
  beneficiary,
  beneficiaryOn,
  onToggleBeneficiary,
  onDigits,
  onQuick,
  onBack,
  onNext,
}: AmountStepProps) {
  /**
   * Trois indications, une seule à la fois. Le refus l'emporte : c'est le seul
   * cas où l'utilisateur a agi et où rien ne s'est passé — il faut lui dire
   * pourquoi.
   */
  const hint = refused
    ? `Maximum ${formatFCFA(MAX_JEF)}`
    : amount > 0 && amount < MIN_JEF
      ? `Minimum ${formatFCFA(MIN_JEF)}`
      : `Entre ${formatNumber(MIN_JEF)} et ${formatNumber(MAX_JEF)} FCFA`;

  return (
    <>
      <Header title="Montant" onBack={onBack} />

      {/*
        Tout ce qui précède le pavé DÉFILE. Sur un écran court, le montant, les
        montants rapides et la ligne de tutelle ne tiennent pas au-dessus d'un
        pavé de quatre rangées ; sans cette zone, le bas serait rogné en silence
        — le pavé et le bouton Continuer, c'est-à-dire tout ce qui permet
        d'avancer. Quand la place ne manque pas, le contenu reste en haut et
        `flexGrow` ouvre le vide sous lui, exactement comme le ferait une marge
        automatique.
      */}
      <ScrollView
        style={styles.amountScroll}
        contentContainerStyle={styles.amountScrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AmountSelector
          value={amount}
          onChange={onQuick}
          label={`Votre Jëf pour ${campaign.name}`}
          style={styles.amount}
        />

        <Text style={[styles.hint, refused && styles.hintWarning]}>{hint}</Text>

        {beneficiary ? (
          <Pressable
            onPress={onToggleBeneficiary}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: beneficiaryOn }}
            style={[styles.tutelle, beneficiaryOn && styles.tutelleOn]}
          >
            <Avatar uri={beneficiary.avatar_url} name={beneficiary.first_name} size={32} />
            <Text style={styles.tutelleLabel} numberOfLines={1}>
              Au nom de {beneficiary.first_name} {beneficiary.last_name}
            </Text>
            <View style={[styles.mark, beneficiaryOn && styles.markOn]}>
              {beneficiaryOn ? <Check size={14} color={Surface.default} strokeWidth={2.5} /> : null}
            </View>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.keypadSlot}>
        <NumericKeypad
          value={digits}
          onChange={onDigits}
          maxLength={MAX_DIGITS}
          keyHeight={keyHeight}
        />
      </View>

      <Button label="Continuer" onPress={onNext} disabled={!valid} />
    </>
  );
}

interface MethodStepProps {
  amount: number;
  method: PaymentMethod;
  collector: boolean;
  collectMode: boolean;
  members: DirectoryUser[];
  memberId: number | null;
  memberQuery: string;
  email: string | null;
  submitting: boolean;
  onBack: () => void;
  onEditAmount: () => void;
  onMethod: (next: PaymentMethod) => void;
  onToggleCollect: () => void;
  onMemberQuery: (next: string) => void;
  onMember: (id: number) => void;
  onSubmit: () => void;
}

function MethodStep({
  amount,
  method,
  collector,
  collectMode,
  members,
  memberId,
  memberQuery,
  email,
  submitting,
  onBack,
  onEditAmount,
  onMethod,
  onToggleCollect,
  onMemberQuery,
  onMember,
  onSubmit,
}: MethodStepProps) {
  return (
    <>
      <Header title="Moyen de paiement" onBack={onBack} />

      <Card style={styles.recap}>
        <View style={styles.recapText}>
          <Text style={styles.recapLabel}>Votre Jëf</Text>
          <Text style={styles.recapAmount}>{formatFCFA(amount)}</Text>
        </View>
        <Pressable onPress={onEditAmount} accessibilityRole="button" style={styles.edit}>
          <Text style={styles.editLabel}>Modifier</Text>
        </Pressable>
      </Card>

      {collector ? (
        <Pressable
          onPress={onToggleCollect}
          accessibilityRole="switch"
          accessibilityState={{ checked: collectMode }}
          style={[styles.collect, collectMode && styles.collectOn]}
        >
          <UserCheck size={18} color={Violet[900]} strokeWidth={1.5} />
          <Text style={styles.collectLabel}>Enregistrer une collecte en espèces</Text>
          <View style={[styles.mark, collectMode && styles.markOn]}>
            {collectMode ? <Check size={14} color={Surface.default} strokeWidth={2.5} /> : null}
          </View>
        </Pressable>
      ) : null}

      <ScrollView
        style={styles.methods}
        contentContainerStyle={styles.methodsInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {collectMode ? (
          <>
            <Input
              placeholder="Chercher un membre"
              value={memberQuery}
              onChangeText={onMemberQuery}
              icon={<Search size={18} color={Ink[300]} strokeWidth={1.5} />}
              autoCorrect={false}
            />
            {members.length === 0 ? (
              <Text style={styles.hint}>Aucun membre ne correspond.</Text>
            ) : (
              members.map((m) => {
                const selected = m.id === memberId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => onMember(m.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.member, selected && styles.memberOn]}
                  >
                    <Avatar uri={m.avatar_url} name={memberName(m)} size={36} />
                    <Text style={styles.memberName} numberOfLines={1}>
                      {memberName(m)}
                    </Text>
                    {selected ? (
                      <Check size={18} color={Violet[700]} strokeWidth={2} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </>
        ) : (
          PAYMENT_METHODS.map((option) => (
            <PaymentMethodRow
              key={option.value}
              method={option}
              selected={option.value === method}
              onPress={() => onMethod(option.value)}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        {/*
          La phrase annonçait « une confirmation par SMS », pour TOUS les
          moyens de paiement, dès qu'un numéro était connu. C'était faux :
          `send_to_user` vit dans `yessal-backend/core/mail.py` et il n'y a
          aucune intégration SMS dans le dépôt. Pour un virement bancaire, rien
          n'arrivait jamais.

          Elle dit maintenant le seul canal qui existe, et seulement à qui
          peut le recevoir — un membre inscrit par téléphone seul n'a pas
          d'adresse, et il vaut mieux ne rien promettre que promettre à vide.

          ⚠ Orange Money et Wave envoient, EUX, un SMS de validation : c'est
          leur écran, pas le nôtre. On ne se l'attribue pas.
        */}
        {!collectMode && email ? (
          <Text style={styles.hint}>
            Vous recevrez une confirmation par courriel à {email}.
          </Text>
        ) : null}
        <Button
          label={collectMode ? "Enregistrer la collecte" : `Payer ${formatFCFA(amount)}`}
          onPress={onSubmit}
          loading={submitting}
          disabled={submitting}
        />
      </View>
    </>
  );
}

/**
 * Le virement est le seul moyen qui ouvre un écran plutôt que de se
 * sélectionner — c'est pour cela que `PaymentMethodRow` lui dessine un chevron
 * et non une case. Sans référence, un virement reçu ne peut être rapproché
 * d'aucun Jëf : le champ n'est pas décoratif.
 */
function WireStep({
  amount,
  value,
  onChange,
  onBack,
  onDone,
}: {
  amount: number;
  value: string;
  onChange: (next: string) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  /*
    L'écran demandait la référence d'un virement sans jamais dire OÙ virer.
    Les coordonnées n'existaient qu'à deux endroits, tous deux hors d'atteinte
    du mobile : les variables d'environnement du tableau de bord, et le
    courriel `virement_instructions` — envoyé APRÈS la déclaration, donc trop
    tard, et jamais reçu par un membre inscrit sans adresse e-mail.

    `null` couvre les deux cas où l'on n'a rien à montrer — configuration
    absente côté serveur (503) ou réseau muet. On n'affiche alors pas
    l'encadré, et la déclaration reste possible : la référence, elle, vient de
    la banque du membre, pas de nous.
  */
  const [bank, setBank] = useState<BankAccount | null>(null);

  useEffect(() => {
    let active = true;
    ContentService.getBankAccount().then((data) => {
      if (active) setBank(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Header title="Virement bancaire" onBack={onBack} />
      <ScrollView
        style={styles.wireScroll}
        contentContainerStyle={styles.wire}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.wireIntro}>
          Virez {formatFCFA(amount)} sur le compte ci-dessous, puis saisissez la
          référence que votre banque vous a donnée. Elle permet de rapprocher les
          fonds de votre Jëf.
        </Text>

        {bank ? <BankPanel bank={bank} /> : null}

        <Input
          label="Référence"
          placeholder="Ex. VIR-2026-00184"
          value={value}
          onChangeText={onChange}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </ScrollView>
      <Button label="Valider" onPress={onDone} disabled={!value.trim()} />
    </>
  );
}

/**
 * Les coordonnées du compte, recopiables.
 *
 * ⚠ L'IBAN se recopie caractère par caractère, souvent debout devant un
 * guichet. Trois précautions, et aucune n'est décorative :
 *   — chiffres à chasse fixe, pour qu'une colonne de chiffres reste lisible ;
 *   — groupement par quatre à l'affichage, mais copie de la valeur BRUTE :
 *     un IBAN collé avec des espaces est refusé par la plupart des banques ;
 *   — bouton de copie sur l'IBAN seul, le seul champ où une faute coûte le
 *     virement.
 */
function BankPanel({ bank }: { bank: BankAccount }) {
  const [copied, setCopied] = useState(false);

  const copyIban = useCallback(async () => {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(bank.iban);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [bank.iban]);

  return (
    <Card style={styles.bank}>
      <Text style={styles.bankTitle}>Compte à créditer</Text>

      <View style={styles.bankRow}>
        <Text style={styles.bankLabel}>Titulaire</Text>
        <Text style={styles.bankValue}>{bank.account_name}</Text>
      </View>

      {bank.bank_name ? (
        <View style={styles.bankRow}>
          <Text style={styles.bankLabel}>Banque</Text>
          <Text style={styles.bankValue}>{bank.bank_name}</Text>
        </View>
      ) : null}

      <View style={styles.bankRow}>
        <Text style={styles.bankLabel}>IBAN</Text>
        <Text style={styles.bankIban} selectable>
          {formatIban(bank.iban)}
        </Text>
        <Pressable
          onPress={copyIban}
          accessibilityRole="button"
          accessibilityLabel="Copier l'IBAN"
          hitSlop={8}
          style={styles.bankCopy}
        >
          {copied ? (
            <Check size={16} color={montant} strokeWidth={2} />
          ) : (
            <Copy size={16} color={Violet[700]} strokeWidth={1.6} />
          )}
          <Text style={[styles.bankCopyLabel, copied && styles.bankCopiedLabel]}>
            {copied ? "IBAN copié" : "Copier"}
          </Text>
        </Pressable>
      </View>

      {bank.bic ? (
        <View style={styles.bankRow}>
          <Text style={styles.bankLabel}>BIC</Text>
          <Text style={styles.bankValue}>{bank.bic}</Text>
        </View>
      ) : null}
    </Card>
  );
}

/** « SN28XXXX… » → « SN28 XXXX … ». Affichage seulement : la copie reste brute. */
function formatIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function DoneStep({
  receipt,
  amount,
  campaign,
  beneficiaryLabel,
  methodLabel,
  onCampaigns,
  onDonations,
}: {
  receipt: Receipt;
  amount: number;
  campaign: Campaign;
  beneficiaryLabel: string;
  methodLabel: string;
  onCampaigns: () => void;
  onDonations: () => void;
}) {
  /** Ce que le serveur sait. Rien d'inventé — voir l'en-tête du fichier. */
  const reference = receipt.donation.external_ref?.trim() || `N° ${receipt.donation.id}`;

  return (
    <ScrollView
      contentContainerStyle={styles.done}
      showsVerticalScrollIndicator={false}
    >
      {/*
        La tuile pastel et le tracé violet sont ceux de l'onboarding : c'est le
        même vocabulaire, à l'autre bout du parcours.
      */}
      <View style={styles.celebration}>
        <ExpoImage
          source={require("@/assets/pictos/generosite.png")}
          style={styles.celebrationPicto}
          contentFit="contain"
        />
      </View>

      <Text style={styles.doneTitle}>{receipt.title}</Text>
      <Text style={styles.doneBody}>Jërëjëf. {receipt.body}</Text>
      <Text style={styles.doneAmount}>{formatFCFA(amount)}</Text>

      <Card padded={false} style={styles.receipt}>
        <Row label="Destination" value={campaign.name} />
        <Row label="Au nom de" value={beneficiaryLabel} />
        <Row label="Moyen" value={methodLabel} />
        <Row label="Référence" value={reference} mono last />
      </Card>

      <View style={styles.doneActions}>
        <Button label="Retour aux Ndiguels" onPress={onCampaigns} />
        <Button label="Voir mes Jëfs" variant="outline" onPress={onDonations} />
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  mono = false,
  last = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivided]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, mono && styles.rowValueMono]}
        numberOfLines={1}
        selectable={mono}
      >
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Surface.default,
    paddingHorizontal: GUTTER,
  },
  centered: { justifyContent: "center" },
  loading: { gap: Space.lg, marginTop: Space.xxl },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },
  headerSlot: { width: 44 },
  headerTitle: { ...Type.cardTitle, color: Ink[900] },

  amountScroll: { flex: 1 },
  /** `flexGrow` ouvre le vide sous le contenu quand la place ne manque pas. */
  amountScrollInner: { flexGrow: 1 },
  amount: { marginTop: Space.xxl },
  hint: { ...Type.label, color: Ink[500], textAlign: "center", lineHeight: 18 },
  hintWarning: { color: Status.warning, fontFamily: Font.bold },

  tutelle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    marginTop: Space.lg,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Border.hairline,
    backgroundColor: Surface.default,
    ...continuous,
  },
  tutelleOn: { borderColor: Violet[500], backgroundColor: Violet[100] },
  tutelleLabel: { ...UIType.personName, color: Ink[900], flex: 1 },

  mark: {
    width: 22,
    height: 22,
    borderRadius: Radius.chip,
    borderWidth: 1.5,
    borderColor: Border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  markOn: { backgroundColor: Violet[700], borderColor: Violet[700] },

  keypadSlot: { paddingBottom: Space.md },

  recap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Space.xl,
  },
  recapText: { gap: 2 },
  recapLabel: { ...Type.label, color: Ink[500] },
  recapAmount: { ...Type.greeting, color: montant },
  edit: {
    height: 40,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.button,
    backgroundColor: Surface.btn,
    alignItems: "center",
    justifyContent: "center",
  },
  editLabel: { ...UIType.chipLabel, color: Ink[900] },

  collect: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    marginTop: Space.lg,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Border.hairline,
    backgroundColor: Pastel.lilac,
    ...continuous,
  },
  collectOn: { borderColor: Violet[500] },
  collectLabel: { ...UIType.chipLabel, color: Violet[900], flex: 1 },

  methods: { flex: 1, marginTop: Space.lg },
  methodsInner: { gap: Space.sm, paddingBottom: Space.lg },

  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Border.hairline,
    ...continuous,
  },
  memberOn: { borderColor: Violet[500], backgroundColor: Violet[100] },
  memberName: { ...UIType.personName, color: Ink[900], flex: 1 },

  footer: { gap: Space.md, paddingTop: Space.sm },

  wireScroll: { flex: 1 },
  wire: { gap: Space.lg, marginTop: Space.xl, paddingBottom: Space.lg },
  wireIntro: { ...Type.body, color: Ink[500] },

  bank: { gap: Space.md },
  bankTitle: { ...Type.label, color: Ink[500], textTransform: "uppercase" },
  bankRow: { gap: 2 },
  bankLabel: { ...Type.micro, color: Ink[300] },
  bankValue: { ...UIType.rowTitle, color: Ink[900] },
  /* Chasse fixe : un IBAN se relit chiffre à chiffre, il ne doit pas danser. */
  bankIban: {
    ...UIType.rowTitle,
    color: Ink[900],
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.4,
  },
  bankCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    alignSelf: "flex-start",
    marginTop: Space.xs,
    minHeight: HIT,
    paddingVertical: Space.xs,
  },
  bankCopyLabel: { ...UIType.chipLabel, color: Violet[700] },
  bankCopiedLabel: { color: montant },

  done: { alignItems: "center", paddingTop: Space.xxl, paddingBottom: Space.xl },
  celebration: {
    width: 132,
    height: 132,
    borderRadius: Radius.card,
    backgroundColor: Pastel.peach,
    alignItems: "center",
    justifyContent: "center",
    ...continuous,
  },
  celebrationPicto: { width: 84, height: 84 },
  doneTitle: { ...Type.screenTitle, color: Violet[900], marginTop: Space.xxl, textAlign: "center" },
  doneBody: {
    ...Type.body,
    color: Ink[500],
    textAlign: "center",
    marginTop: Space.sm,
    maxWidth: 300,
  },
  doneAmount: { ...Type.amountHero, color: montant, marginTop: Space.xl },

  receipt: { width: "100%", marginTop: Space.xxl, paddingHorizontal: Space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.lg,
    paddingVertical: Space.md,
  },
  rowDivided: { borderBottomWidth: 1, borderBottomColor: Border.hairline },
  rowLabel: { ...Type.label, color: Ink[500] },
  rowValue: { ...UIType.chipLabel, color: Ink[900], flexShrink: 1, textAlign: "right" },
  /**
   * La planche met la référence en chasse fixe. Aucune fonte monospace n'est
   * embarquée, et en réclamer une renverrait à la fonte système du téléphone —
   * une seconde fonte pour une seule ligne. Ce qui compte réellement dans une
   * référence, c'est que les chiffres aient tous la même largeur : c'est ce que
   * font les chiffres tabulaires de Plus Jakarta Sans.
   */
  rowValueMono: { fontVariant: TABULAR, letterSpacing: 0.3 },

  doneActions: { width: "100%", gap: Space.md, marginTop: Space.xxl },
});
