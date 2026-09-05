/**
 * app/(app)/(tabs)/profile.tsx — le Profil.
 *
 * **Allégé par le §3.4 du plan.** L'ancien écran faisait 738 lignes et
 * mélangeait quatre choses : l'identité, un formulaire d'état civil complet
 * (naissance, genre, statut marital, groupe sanguin, adresse, code postal), la
 * sécurité, et les tutelles. La planche n'en garde qu'une : **qui je suis, ce
 * que j'ai donné, et pour qui.** Le reste est passé aux Paramètres, derrière
 * l'engrenage de l'en-tête.
 *
 * ── Ce qui a disparu, et où c'est parti ─────────────────────────────────────
 *
 * | Retiré d'ici | Devenu |
 * |---|---|
 * | Formulaire d'état civil (11 champs) | Aucun écran. **Voir plus bas.** |
 * | Sécurité, mot de passe, sessions | `profile/settings.tsx` |
 * | Préférences de notifications | `profile/settings.tsx`, et **elles règlent enfin quelque chose** |
 * | Changement de photo | `profile/settings.tsx` |
 * | Bandeau « Profil incomplet » | Retiré : il réclamait des champs que plus aucun écran ne demande |
 *
 * ⚠ **Le formulaire d'état civil n'a pas de nouveau domicile.** Onze champs
 * — `birth_date`, `gender`, `marital_status`, `blood_type`, `residence_country`,
 * `state`, `city`, `address`, `zip_code`, `title`… — que `ProfileUpdatePayload`
 * accepte toujours et que plus aucun écran mobile n'écrit. Ce n'est pas un
 * oubli : la planche ne les dessine nulle part, et deviner un écran pour eux
 * aurait été inventer du produit. **Ils restent modifiables depuis
 * l'administration web.** Porté au registre de dette.
 *
 * ── Deux écarts par rapport à la planche, tous deux pour ne pas mentir ──────
 *
 * 1. **« Moyens de paiement » est retiré.** La planche pose la ligne, mais le
 *    §5.3 du plan a tranché au brief : pas de tokenisation, pas de carte
 *    enregistrée. La ligne n'aurait mené nulle part. Remplacée par « Mes
 *    Jëfs », qui existe.
 * 2. **« Ndiguels suivis » devient « Ndiguels soutenus ».** Il n'y a pas de
 *    notion de suivi dans ce produit — rien côté serveur ne dit qu'un membre
 *    « suit » un Ndiguel. Ce qu'on sait compter, c'est à combien de Ndiguels
 *    distincts il a donné cette année. C'est un vrai chiffre, et c'est même
 *    celui qui l'intéresse.
 *
 * La ligne « Langue · Français » tombe pour la même raison qu'aux Paramètres :
 * rien n'est traduit, un choix affiché serait un choix imaginaire.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Menu, Settings } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContentService } from "@/lib/content.service";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { formatFCFA, formatNumber } from "@/lib/format";
import { ProfileService, type JefSummary } from "@/lib/profile.service";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import type { Tutelle } from "@/types/content.types";
import type { UserRole } from "@/types/auth.types";
import {
  Border,
  GUTTER,
  Ink,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
  montant,
} from "@/theme";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  chef_daara: "Chef de Daara",
  collector: "Collecteur",
  member: "Talibé",
  tutelle: "Tutelle",
};

interface State {
  status: "loading" | "ready" | "failed";
  summary: JefSummary | null;
  tutelles: Tutelle[];
}

/** ⚠ Pas de `as const` : il figerait le tableau en `readonly`. */
const EMPTY: Omit<State, "status"> = { summary: null, tutelles: [] };

/**
 * Les deux appels partent ensemble. **Aucun des deux n'est fatal** : sans le
 * résumé, les compteurs montrent un tiret ; sans les tutelles, la section est
 * vide. Un profil qui refuse de s'afficher parce qu'un total n'est pas arrivé
 * serait disproportionné — l'identité, elle, est déjà en mémoire.
 */
async function fetchProfile(userId: number): Promise<State> {
  const year = new Date().getFullYear();
  const [summary, tutelles] = await Promise.all([
    ProfileService.getJefSummary(userId, year).catch(() => null),
    ContentService.getTutelles().catch(() => [] as Tutelle[]),
  ]);
  return { status: "ready", summary, tutelles };
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const openDrawer = useUiStore((state) => state.openDrawer);
  const completion = useProfileCompletion();

  const [state, setState] = useState<State>({ status: "loading", ...EMPTY });

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchProfile(userId).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const openTutelles = useCallback(() => router.push("/profile/tutelle"), [router]);

  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
  const role = user?.role ? ROLE_LABELS[user.role] : null;
  const daara = user?.daara_name ?? user?.daara?.name ?? null;
  const { status, summary, tutelles } = state;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <IconButton
          icon={<Menu size={20} color={Ink[900]} strokeWidth={1.6} />}
          accessibilityLabel="Ouvrir le menu"
          onPress={openDrawer}
        />
        <Text style={styles.title}>Profil</Text>
        <IconButton
          icon={<Settings size={20} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel="Paramètres"
          onPress={() => router.push("/profile/settings")}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/*
          Règle de produit Yessal, tenue aussi par `front-web` : l'alerte reste
          tant que le profil n'est pas renseigné. `flush` — la gouttière est
          déjà portée par le conteneur de défilement.
        */}
        <ProfileCompletionBanner state={completion} flush />

        <View style={styles.identity}>
          {/*
            ⚠ CE BLOC NE LISAIT QUE `avatar_url`, ET MONTRAIT DONC DES INITIALES
            À QUI AVAIT TÉLÉVERSÉ SA PHOTO. Le modèle porte DEUX champs pour une
            seule chose : `avatar` est le fichier envoyé depuis l'application,
            `avatar_url` une adresse extérieure. Un membre qui passe par
            « Changer la photo » renseigne le PREMIER, et `avatar_url` reste nul.

            L'accueil, lui, lisait bien `avatar_url ?? avatar` : la photographie
            apparaissait en haut à droite et disparaissait sur le profil, ce que
            les captures du 2026-09-05 montraient sans qu'on le remarque.

            `Avatar` porte déjà les deux cas — photographie ou initiales — et
            c'est la seule raison de ne pas réécrire ce choix à chaque écran.
          */}
          <Avatar
            uri={user?.avatar_url ?? user?.avatar}
            name={fullName}
            size={68}
          />
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName || "Mon compte"}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[role, daara].filter(Boolean).join(" · ")}
            </Text>
            {user?.phone ? (
              <Text style={[styles.meta, styles.phone]} numberOfLines={1}>
                {user.phone}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.stats}>
          <Stat
            label={`Mes Jëfs en ${new Date().getFullYear()}`}
            value={summary ? formatFCFA(summary.total) : null}
            loading={status === "loading"}
            tone="montant"
          />
          <Stat
            label="Ndiguels soutenus"
            value={summary ? formatNumber(summary.campaignCount) : null}
            loading={status === "loading"}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Mes tutelles</Text>
            <Pressable onPress={openTutelles} accessibilityRole="button" hitSlop={Space.sm}>
              <Text style={styles.sectionAction}>Ajouter</Text>
            </Pressable>
          </View>

          {status === "loading" ? (
            <Skeleton width="100%" height={72} radius={Radius.card} />
          ) : tutelles.length === 0 ? (
            <EmptyState
              title="Aucune tutelle"
              body="Ajoutez un proche pour faire un Jëf en son nom."
              actionLabel="Ajouter un proche"
              onAction={openTutelles}
              card
            />
          ) : (
            tutelles.map((tutelle) => (
              <TutelleRow key={tutelle.id} tutelle={tutelle} onPress={openTutelles} />
            ))
          )}
        </View>

        <View style={styles.links}>
          <LinkRow label="Mes Jëfs" onPress={() => router.push("/donations")} />
          <LinkRow
            label="Mes documents"
            onPress={() => router.push("/profile/documents")}
            last
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: string | null;
  loading: boolean;
  tone?: "montant";
}) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      {loading ? (
        <Skeleton width="70%" height={22} />
      ) : (
        /*
          Un tiret cadratin plutôt qu'un zéro quand le chiffre n'est pas arrivé :
          « 0 FCFA » est une information, et elle serait fausse.
        */
        <Text style={[styles.statValue, tone === "montant" && styles.statMontant]}>
          {value ?? "—"}
        </Text>
      )}
    </Card>
  );
}

function TutelleRow({ tutelle, onPress }: { tutelle: Tutelle; onPress: () => void }) {
  const name = `${tutelle.first_name} ${tutelle.last_name}`.trim();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={styles.tutelle}
    >
      <Avatar uri={tutelle.avatar_url} name={name} size={44} />
      <View style={styles.tutelleText}>
        <Text style={styles.tutelleName} numberOfLines={1}>
          {name}
        </Text>
        {/*
          La planche ajoute « · 2 Jëfs en son nom ». Le compte par tutelle n'est
          nulle part dans l'API — `DonationViewSet` filtre par donateur, pas par
          bénéficiaire. On dit la relation, qui est vraie, plutôt qu'un chiffre
          qu'il faudrait inventer.
        */}
        <Text style={styles.tutelleRelation} numberOfLines={1}>
          {tutelle.relation}
        </Text>
      </View>
      <ChevronRight size={20} color={Ink[300]} strokeWidth={1.5} />
    </Pressable>
  );
}

function LinkRow({
  label,
  onPress,
  last,
}: {
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.link, last && styles.linkLast]}
    >
      <Text style={styles.linkLabel}>{label}</Text>
      <ChevronRight size={20} color={Ink[300]} strokeWidth={1.5} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default, paddingHorizontal: GUTTER },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingTop: Space.sm,
  },
  title: { ...Type.screenTitle, fontSize: 28, lineHeight: 32, color: Violet[900], flex: 1 },

  /** La barre d'onglets flotte : le contenu doit pouvoir défiler dessous. */
  scroll: { paddingTop: Space.lg, paddingBottom: 110, gap: Space.xl },

  identity: { flexDirection: "row", alignItems: "center", gap: Space.lg },
  identityText: { flex: 1, gap: 3 },
  name: { ...Type.amountCard, fontSize: 20, color: Violet[900] },
  meta: { ...Type.label, color: Ink[500] },
  phone: { fontVariant: ["tabular-nums"] },

  stats: { flexDirection: "row", gap: Space.md },
  stat: { flex: 1, gap: Space.xs },
  statLabel: { ...Type.label, color: Ink[500] },
  statValue: { ...Type.amountCard, color: Ink[900] },
  statMontant: { color: montant },

  section: { gap: Space.md },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: { ...Type.cardTitle, color: Ink[900] },
  sectionAction: { ...UIType.badgeLabel, fontSize: 12, color: Violet[700] },

  tutelle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Border.hairline,
    backgroundColor: Surface.default,
    ...continuous,
  },
  tutelleText: { flex: 1, gap: 2 },
  tutelleName: { ...UIType.rowTitle, color: Ink[900] },
  tutelleRelation: { ...Type.label, color: Ink[500], textTransform: "capitalize" },

  links: {},
  /** Un filet en haut de chaque ligne, et un de plus sous la dernière : la
   *  pile est ainsi fermée des deux côtés sans doubler les traits entre elles. */
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Space.lg,
    borderTopWidth: 1,
    borderTopColor: Border.hairline,
  },
  linkLast: { borderBottomWidth: 1, borderBottomColor: Border.hairline },
  linkLabel: { ...UIType.personName, color: Ink[900] },
});
