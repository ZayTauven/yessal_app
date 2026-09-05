/**
 * app/gallery.tsx — la galerie interne des primitives.
 *
 * Sortie vérifiable de la phase B : les dix-sept composants du contrat, à
 * leur taille réelle, avec leurs états. Ce n'est pas un écran du produit —
 * aucun onglet n'y mène, aucun lien ne la cite. On y arrive par l'URL
 * `/gallery` (`npx expo start`, puis `yessalgui://gallery`).
 *
 * Les pictogrammes d'interface restent ceux de Lucide, et c'est voulu : le jeu
 * livré par le commanditaire le 2026-09-04 (`assets/pictos/`) est un jeu
 * ILLUSTRATIF — des tracés dessinés à la main, faits pour être vus à 56 px sur
 * un aplat pastel. Une flèche de retour ou une cloche de notification demande
 * autre chose. Voir §12 du plan.
 */
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  Grid2x2,
  HandHeart,
  Home,
  MessageSquare,
  Newspaper,
  Plus,
  Scroll,
  Share2,
  User,
  UserPlus,
  WifiOff,
  X,
} from "lucide-react-native";

import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QuickActionRow, QuickActionTile } from "@/components/ui/QuickActionTile";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  Skeleton,
  SkeletonCampaignCard,
  SkeletonListRow,
  SkeletonTutelleCard,
} from "@/components/ui/Skeleton";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { AmountSelector } from "@/components/donation/AmountSelector";
import { NumericKeypad } from "@/components/donation/NumericKeypad";
import {
  PAYMENT_METHODS,
  PaymentMethodRow,
} from "@/components/donation/PaymentMethodRow";
import { TabBar } from "@/components/navigation/TabBar";
import { TutelleCard, TutelleEmptyState } from "@/components/profile/TutelleCard";

import { formatFCFA } from "@/lib/format";
import type { PaymentMethod } from "@/types/donation.types";
import {
  Border,
  GUTTER,
  Ink,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  montant,
} from "@/theme";

const DEMO_PEOPLE = [
  { name: "Ibrahima Fall" },
  { name: "Fatou Mbaye" },
  { name: "Aïda Diop" },
];

const FILTERS = ["Tous", "Actifs", "Clôturés", "À venir"];

const DEMO_PHOTO = require("@/assets/images/onboarding-1.jpg");

export default function Gallery() {
  const [filter, setFilter] = useState("Tous");
  const [method, setMethod] = useState<PaymentMethod>("orange_money");
  /** Le pavé édite une chaîne de chiffres ; le montant s'en déduit. */
  const [amountDigits, setAmountDigits] = useState("25000");
  const amount = Number(amountDigits || 0);
  const [tab, setTab] = useState("home");
  const [phone, setPhone] = useState("77 641 22 08");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Yessal Gui</Text>
          <Text style={styles.introBody}>
            Les dix-sept composants du contrat. Galerie interne — phase B.
          </Text>
        </View>

        {/* 1 — Button */}
        <Section title="Button" note="hauteur 52 · capsule · 15 / 700 · pressé 0,72">
          <Button
            label="Faire un Jëf"
            onPress={noop}
            icon={<Plus size={18} color={Violet[900]} strokeWidth={1.5} />}
          />
          <Button label="Chargement" onPress={noop} loading />
          <Button label="Faire un Jëf" onPress={noop} disabled />
          <Button label="Annuler" onPress={noop} variant="secondary" />
          <Button label="Voir le Ndiguel" onPress={noop} variant="outline" />
          <Button label="Passer" onPress={noop} variant="ghost" />
          <Row>
            <IconButton
              icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
              onPress={noop}
              accessibilityLabel="Revenir"
            />
            <IconButton
              icon={<X size={20} color={Ink[900]} strokeWidth={1.5} />}
              onPress={noop}
              accessibilityLabel="Fermer"
            />
            <IconButton
              icon={<ArrowRight size={20} color={Violet[900]} strokeWidth={1.5} />}
              onPress={noop}
              accessibilityLabel="Continuer"
              tone="accent"
            />
          </Row>
        </Section>

        {/* 2 — Input */}
        <Section title="Input" note="violet-100 · rayon 14 · hauteur 56 · libellé 12 / 500">
          <Input
            label="Téléphone"
            prefix="+221"
            placeholder="77 000 00 00"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="Téléphone"
            prefix="+221"
            value="77 64"
            error="Numéro incomplet — 9 chiffres attendus"
            onChangeText={noop}
          />
          <Input label="Mot de passe" isPassword value="motdepasse" onChangeText={noop} />
          <Input
            label="Daara"
            value=""
            placeholder="Daara — attribué par l'administrateur"
            disabled
            onChangeText={noop}
          />
        </Section>

        {/* 3 — Chip */}
        <Section title="Chip" note="36 px visibles, 44 de zone tactile">
          <Row wrap>
            {FILTERS.map((f) => (
              <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
            ))}
            <Chip label="Non lus" count={3} onPress={noop} />
          </Row>
        </Section>

        {/* 4 — Badge */}
        <Section title="Badge" note="marge 6 / 12 · 11 / 700">
          <Row wrap>
            <Badge label="J-10" />
            <Badge label="J-10 · sur photo" tone="onPhoto" />
            <Badge label="Actif" tone="active" />
            <Badge label="Clôturé" tone="closed" />
            <Badge label="À venir" tone="upcoming" />
            <Dot />
          </Row>
        </Section>

        {/* 5 — Avatar */}
        <Section title="Avatar" note="44 · repli initiales · pile">
          <Row>
            <Avatar name="Modou Fall" />
            <Avatar name="Sokhna Aïda" size={56} />
            <AvatarStack people={DEMO_PEOPLE} total={41} />
          </Row>
        </Section>

        {/* 6 — QuickActionTile */}
        <Section title="QuickActionTile" note="carrée · rayon 20 · la rangée ne défile pas">
          <QuickActionRow>
            <QuickActionTile
              label="Ndiguels"
              tone="peach"
              onPress={noop}
              picto={<Scroll size={40} color={Violet[900]} strokeWidth={1.5} />}
            />
            <QuickActionTile
              label="Actualités"
              tone="yellow"
              onPress={noop}
              picto={<Newspaper size={40} color={Violet[900]} strokeWidth={1.5} />}
            />
            <QuickActionTile
              label="Mon Daara"
              tone="teal"
              onPress={noop}
              picto={<Home size={40} color={Violet[900]} strokeWidth={1.5} />}
            />
          </QuickActionRow>
          <Note>
            Pictogrammes Lucide, provisoires — le jeu de dix tracés originaux reste
            dû (§3.5).
          </Note>
        </Section>

        {/* 7 — Card */}
        <Section title="Card" note="blanc · rayon 20 continu · filet 8 % · AUCUNE ombre">
          <Card>
            <View style={styles.cardHead}>
              <Text style={styles.cardLabel}>Total de mes Jëfs</Text>
              <Text style={styles.cardYear}>2026</Text>
            </View>
            <Text style={styles.cardAmount} selectable>
              {formatFCFA(1_250_000)}
            </Text>
            <Row>
              <Button label="Faire un Jëf" onPress={noop} size="md" style={styles.flex} />
              <Button
                label="Historique"
                onPress={noop}
                size="md"
                variant="secondary"
                style={styles.flex}
              />
            </Row>
          </Card>
        </Section>

        {/* 8 — CampaignCard */}
        <Section title="CampaignCard" note="200 px · voile vertical · quatre états">
          <CampaignCard
            title="Ndiguel Magal 2026"
            subtitle="Daara de Ndiassane · 412 talibés"
            image={DEMO_PHOTO}
            badge="J-10"
            raised={1_250_000}
            goal={2_000_000}
            onPress={noop}
          />
          <Caption>montants visibles — chef de Daara</Caption>

          <CampaignCard
            title="Ndiguel Magal 2026"
            subtitle="Daara de Ndiassane · 412 talibés"
            image={DEMO_PHOTO}
            badge="J-10"
            amountsHidden
            participants={DEMO_PEOPLE}
            participationLabel="Vous et 411 talibés y participez"
            onPress={noop}
          />
          <Caption>montants masqués — talibé</Caption>

          <SkeletonCampaignCard />
          <Caption>chargement — aux formes du contenu réel</Caption>

          <ErrorState
            body="Les Ndiguels n'ont pas pu être chargés."
            onRetry={noop}
            picto={<WifiOff size={44} color={Violet[900]} strokeWidth={1.5} />}
          />
          <Caption>erreur réseau — 3G intermittente</Caption>
        </Section>

        {/* 9 — ProgressBar */}
        <Section title="ProgressBar" note="piste 8 · violet-100 · remplissage violet-500">
          <ProgressBar progress={0.62} leftLabel="62 % de l'objectif" rightLabel="J-10" />
          <ProgressBar hidden leftLabel="La progression n'est pas visible pour votre rôle" />
          <ProgressBar progress={1} leftLabel="Objectif atteint" rightLabel="Clôturé" />
        </Section>

        {/* 10 — Skeleton */}
        <Section title="Skeleton" note="0,55 → 1 sur 1,4 s · décalage 0,15 s">
          <Skeleton width="70%" height={18} />
          <Skeleton width="45%" height={12} delay={150} />
          <SkeletonListRow />
          <Row>
            <SkeletonTutelleCard />
            <SkeletonTutelleCard />
          </Row>
        </Section>

        {/* 11 et 12 — AmountSelector · NumericKeypad */}
        <Section
          title="AmountSelector · NumericKeypad"
          note="touches 72 · chiffres 24 / 600 · touche « 000 »"
        >
          <AmountSelector
            value={amount}
            onChange={(next) => setAmountDigits(String(next))}
          />
          <NumericKeypad value={amountDigits} onChange={setAmountDigits} />
        </Section>

        {/* 13 — PaymentMethodRow */}
        <Section
          title="PaymentMethodRow"
          note="hauteur 68 · cinq moyens, alignés sur le backend"
        >
          {PAYMENT_METHODS.map((m) => (
            <PaymentMethodRow
              key={m.value}
              method={m}
              selected={method === m.value}
              onPress={() => setMethod(m.value)}
            />
          ))}
          <Note>
            {"Cinq lignes, pas huit : PayPal et Free Money n'ont aucun contrat " +
              "côté Django (§3.1). Le virement porte un chevron — il ouvre un " +
              "second écran."}
          </Note>
        </Section>

        {/* 14 — TutelleCard */}
        <Section title="TutelleCard" note="l'état vide est le cas majoritaire">
          <Row>
            <TutelleCard name="Fatou Mbaye" relation="Mère" amount={75_000} />
            <TutelleCard name="Aliou Diop" relation="Petit-neveu maternel" amount={10_000} />
          </Row>
          <Row>
            <TutelleCard name="Fatou Mbaye" relation="Mère" amountsHidden donationCount={4} />
            <SkeletonTutelleCard />
          </Row>
          <TutelleEmptyState onAdd={noop} />
        </Section>

        {/* 15 — EmptyState */}
        <Section
          title="EmptyState"
          note="une illustration et une action, jamais un texte gris seul"
        >
          <EmptyState
            picto={<UserPlus size={56} color={Violet[900]} strokeWidth={1.5} />}
            title="Aucun Ndiguel en cours"
            body="Le chef de votre Daara n'a pas encore ouvert de collecte."
            actionLabel="Actualiser"
            onAction={noop}
          />
        </Section>

        {/* 16 — ScreenHeader */}
        <Section title="ScreenHeader" note="titre centré · deux actions de 44" flush>
          <ScreenHeader
            title="Ndiguel Magal 2026"
            onBack={noop}
            right={{
              icon: <Share2 size={20} color={Ink[900]} strokeWidth={1.5} />,
              accessibilityLabel: "Partager",
              onPress: noop,
            }}
          />
          <ScreenHeader
            title="Accueil"
            left={{
              icon: <Grid2x2 size={20} color={Ink[900]} strokeWidth={1.5} />,
              accessibilityLabel: "Ouvrir le menu",
              onPress: noop,
            }}
            right={{
              icon: <Bell size={20} color={Ink[900]} strokeWidth={1.5} />,
              accessibilityLabel: "Notifications",
              onPress: noop,
            }}
          />
        </Section>

        {/* 17 — TabBar */}
        <Section
          title="TabBar"
          note="4 onglets + action centrale (§2) · capsule violet-300"
        >
          <View style={styles.tabStage}>
            <TabBar
              activeKey={tab}
              items={[
                {
                  key: "home",
                  label: "Accueil",
                  icon: (p) => <Home {...p} strokeWidth={1.6} />,
                  onPress: () => setTab("home"),
                },
                {
                  key: "ndiguels",
                  label: "Ndiguels",
                  icon: (p) => <Scroll {...p} strokeWidth={1.6} />,
                  onPress: () => setTab("ndiguels"),
                },
                {
                  key: "messages",
                  label: "Messages",
                  icon: (p) => <MessageSquare {...p} strokeWidth={1.6} />,
                  badge: true,
                  onPress: () => setTab("messages"),
                },
                {
                  key: "profil",
                  label: "Profil",
                  icon: (p) => <User {...p} strokeWidth={1.6} />,
                  onPress: () => setTab("profil"),
                },
              ]}
              center={{
                icon: (p) => <HandHeart {...p} strokeWidth={1.6} />,
                accessibilityLabel: "Faire un Jëf",
                onPress: noop,
              }}
            />
          </View>
          <Note>
            {"Le bouton central n'est pas un onglet : il ouvre le flux de " +
              "contribution en modal, par-dessus l'onglet courant."}
          </Note>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function noop() {}

function Section({
  title,
  note,
  children,
  flush = false,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      </View>
      <View style={[styles.sectionBody, flush && styles.flush]}>{children}</View>
    </View>
  );
}

function Row({ children, wrap = false }: { children: React.ReactNode; wrap?: boolean }) {
  return <View style={[styles.row, wrap && styles.wrap]}>{children}</View>;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.alt },
  content: { paddingBottom: Space.huge * 2 },
  intro: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.xxl,
    paddingBottom: Space.lg,
    gap: 6,
  },
  introTitle: { ...Type.screenTitle, color: Violet[900] },
  introBody: { ...Type.body, color: Ink[500] },

  section: { paddingTop: Space.xxxl, gap: Space.lg },
  sectionHead: { paddingHorizontal: GUTTER, gap: 4 },
  sectionTitle: { ...Type.cardTitle, color: Ink[900] },
  sectionNote: { ...Type.label, color: Ink[300] },
  sectionBody: { paddingHorizontal: GUTTER, gap: Space.md },
  flush: { paddingHorizontal: 0 },

  row: { flexDirection: "row", gap: Space.md, alignItems: "center" },
  wrap: { flexWrap: "wrap" },
  flex: { flex: 1 },

  caption: { ...Type.label, color: Violet[700] },
  note: {
    ...UIType.stateBody,
    color: Ink[500],
    borderLeftWidth: 2,
    borderLeftColor: Border.strong,
    paddingLeft: Space.md,
  },

  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: { ...Type.label, color: Ink[500] },
  cardYear: { ...Type.micro, color: Ink[300] },
  cardAmount: { ...Type.amountHero, color: montant, marginVertical: 14 },

  tabStage: {
    height: 110,
    backgroundColor: Surface.default,
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Border.hairline,
  },
});
