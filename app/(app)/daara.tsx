/**
 * app/(app)/daara.tsx — Mon Daara.
 *
 * Planche « Accueil et Onglets », état `isDaara`. Écran de pile, atteint par le
 * tiroir : une photographie qui porte le nom, la carte du chef, trois
 * compteurs, les visages du Daara, puis ses chantiers en cours.
 *
 * ── Ce que le serveur sait, et ce qu'il ne sait pas ─────────────────────────
 *
 * Tout ce qui est dessiné ici vient de `DaaraSerializer`
 * (`accounts/serializers.py`), servi imbriqué dans `GET /api/profile/`. Ses
 * champs sont : `id`, `ldd`, `name`, `chef`, `is_active`, les deux horodatages,
 * `members_count`, `chef_full_name` et `collectors`. **Rien d'autre.**
 *
 * Trois conséquences, toutes visibles à l'écran :
 *
 * 1. **Le modèle `Daara` ne porte AUCUNE photographie.** La planche en montre
 *    une (`assets/photos/daara-2x1.jpg`). Celle d'ici est donc un pis-aller
 *    assumé — un rassemblement authentique fourni par le commanditaire, muet
 *    sur l'identité du Daara, exactement comme les portraits de Sokhna Aïda le
 *    sont pour un Ndiguel sans image (`lib/campaign-visuals.ts`). Elle cédera
 *    la place le jour où le modèle gagnera un champ image.
 * 2. **Le compteur de gauche ET la section disent « Membres », pas « Talibés ».**
 *
 *    ⚠ La phase E n'avait renommé QUE le compteur : la section qui liste les
 *    mêmes personnes est restée « Les talibés » jusqu'à la capture du
 *    2026-09-05, où l'on voit « Membres 4 », « Collecteurs 1 » et quatre
 *    visages sous « Les talibés » — le chef et le collecteur y compris. Le
 *    texte d'état vide juste en dessous disait déjà « Aucun membre », les deux
 *    mots se contredisaient dans le même bloc.
 *    `get_members_count` compte TOUS les rattachés — chef et collecteurs
 *    compris. Écrire « 412 talibés » là où le serveur dit « 412 rattachés »
 *    donnerait un chiffre faux de quelques unités, et personne ne saurait
 *    lesquelles.
 * 3. **Il n'y a ni description, ni code, ni adresse de Daara.** L'ancien écran
 *    affichait une carte « Description » qui ne pouvait, structurellement, dire
 *    que « Aucune description disponible » : le champ n'existe pas sur le
 *    modèle. Elle est partie avec le reste.
 *
 * ── Le décompte des Ndiguels ────────────────────────────────────────────────
 *
 * `GET /api/events/campaigns/` n'est PAS filtré par Daara — `CampaignViewSet`
 * rend `Campaign.objects.all()`. Le filtre est donc posé ici, sur
 * `campaign.daara`. Même remarque pour l'annuaire : `DirectoryUserViewSet` ne
 * restreint au Daara de l'appelant que pour `member` et `chef_daara` ; un
 * collecteur ou un administrateur reçoit toute la communauté.
 *
 * ── Ce que le vide dit, et ce que l'échec dit ───────────────────────────────
 *
 * `members` et `campaigns` valent `null` quand l'appel a échoué, `[]` quand il
 * a répondu vide. La distinction n'est pas décorative : un compteur à « 0 »
 * après une coupure réseau est un mensonge, alors qu'un tiret ne prétend rien.
 *
 * ⚠ LES MONTANTS SONT SOUMIS AU RÔLE (`lib/roles.ts`). Un talibé ne voit pas la
 * somme collectée d'un chantier ; il en voit l'état et l'échéance. L'écran ne
 * rétrécit pas — la colonne de droite change de contenu, pas de largeur.
 * Ce masquage est une règle d'AFFICHAGE, pas une frontière de sécurité :
 * l'en-tête de `lib/roles.ts` le dit et le porte au registre de dette.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Building2,
  ChevronLeft,
  Hammer,
  Menu,
  Phone,
  Search,
} from "lucide-react-native";

import { Avatar, AvatarStack, type StackedPerson } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonListRow } from "@/components/ui/Skeleton";
import { campaignVisual } from "@/lib/campaign-visuals";
import { ContentService } from "@/lib/content.service";
import { formatCountdown, formatFCFA, formatNumber } from "@/lib/format";
import { canSeeAmounts } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import type { Daara, DirectoryUser, UserRole } from "@/types/auth.types";
import type { Campaign, CampaignStatus } from "@/types/campaign.types";
import {
  Font,
  GUTTER,
  Ink,
  Radius,
  ScrimPhoto,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
  montant,
  noTouch,
  passThrough,
} from "@/theme";

/**
 * La photographie d'en-tête. Voir l'en-tête du fichier : le modèle `Daara` n'en
 * porte pas, c'est un pis-aller. Ce fichier dormait sans appelant depuis la
 * phase D — il est authentique, il retrouve un emploi.
 */
const HERO_PHOTO = require("@/assets/photos/reel/rassemblement-a-2x1.jpg");

/** Hauteur utile de la photographie, mesurée sur la planche. */
const HERO_HEIGHT = 236;
/** Visages montrés avant « et N autres ». */
const FACES = 5;
/** L'annuaire se déplie par tranches — un Daara peut compter 400 membres. */
const DIRECTORY_PAGE = 20;
/** Chantiers listés avant le renvoi vers la liste complète. */
const CHANTIERS = 5;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  chef_daara: "Chef de Daara",
  collector: "Collecteur",
  member: "Talibé",
  tutelle: "Tutelle",
};

/**
 * Un Ndiguel est un chantier du Daara : ce sont les mots de la planche, pas
 * ceux de l'API. `CampaignStatus` en compte quatre, la planche n'en montre
 * qu'un — les trois autres se disent quand même, sans quoi un chantier achevé
 * se lirait comme un chantier ouvert.
 */
const CHANTIER_LABELS: Record<CampaignStatus, string> = {
  active: "Chantier ouvert",
  pending: "Chantier en préparation",
  completed: "Chantier achevé",
  inactive: "Chantier suspendu",
};

interface DaaraState {
  status: "loading" | "ready" | "failed";
  /** `null` avec `status: "ready"` : le compte n'est rattaché à aucun Daara. */
  daara: Daara | null;
  /** `null` = l'annuaire n'a pas répondu. `[]` = il a répondu vide. */
  members: DirectoryUser[] | null;
  /** `null` = la liste des Ndiguels n'a pas répondu. `[]` = aucun. */
  campaigns: Campaign[] | null;
}

/** ⚠ Pas de `as const` : il figerait les champs en `readonly`. */
const EMPTY: Omit<DaaraState, "status" | "daara"> = { members: null, campaigns: null };

function fullName(person: { first_name?: string | null; last_name?: string | null }): string {
  return `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || "Membre";
}

/**
 * Les trois appels partent ENSEMBLE, bien que le filtrage des deux derniers
 * dépende de l'identifiant du premier : ce filtrage a lieu après, une fois tout
 * résolu. Les enchaîner triplerait l'attente sur une 3G intermittente.
 *
 * Seul l'échec du profil fait basculer l'écran en erreur — sans le Daara il n'y
 * a rien à montrer. Un annuaire ou une liste de Ndiguels manquante retire une
 * section, elle ne condamne pas l'écran.
 *
 * ⚠ La fonction rend un état COMPLET, et elle est asynchrone : le `setState` de
 * l'appelant vit après l'`await`, donc hors du chemin synchrone que
 * `react-hooks/set-state-in-effect` refuse (React Compiler actif).
 */
async function fetchDaara(): Promise<DaaraState> {
  const [daara, members, campaigns] = await Promise.all([
    /* `undefined` = l'appel a échoué ; `null` = il a répondu « aucun Daara ». */
    ContentService.getMyDaara().catch(() => undefined),
    ContentService.getDirectory().catch(() => null),
    ContentService.getCampaigns().catch(() => null),
  ]);

  if (daara === undefined) return { status: "failed", daara: null, ...EMPTY };
  if (daara === null) return { status: "ready", daara: null, ...EMPTY };

  return {
    status: "ready",
    daara,
    members: members?.filter((m) => m.daara?.id === daara.id) ?? null,
    campaigns: campaigns?.filter((c) => c.daara === daara.id) ?? null,
  };
}

export default function DaaraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const { user } = useAuthStore();
  const showsAmounts = canSeeAmounts(user?.role);

  const [state, setState] = useState<DaaraState>({
    status: "loading",
    daara: null,
    ...EMPTY,
  });
  const [refreshing, setRefreshing] = useState(false);
  /** 0 = annuaire replié. La planche montre les visages, pas la liste. */
  const [directoryLimit, setDirectoryLimit] = useState(0);
  /** Le filtre de l'annuaire. Local : la liste est déjà chargée entière. */
  const [directoryQuery, setDirectoryQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetchDaara().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setState((previous) => ({ ...previous, status: "loading" }));
    setState(await fetchDaara());
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setState(await fetchDaara());
    setRefreshing(false);
  }, []);

  const { status, daara, members, campaigns } = state;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {status === "failed" ? (
        <View style={[styles.centered, { paddingTop: insets.top + Space.huge }]}>
          <ErrorState body="Votre Daara n'a pas pu être chargé." onRetry={reload} />
        </View>
      ) : status === "ready" && !daara ? (
        <View style={[styles.centered, { paddingTop: insets.top + Space.huge }]}>
          <EmptyState
            picto={<Building2 size={56} color={Violet[900]} strokeWidth={1.5} />}
            title="Aucun Daara rattaché"
            body="Votre compte n'est rattaché à aucune communauté. Le chef de votre Daara peut vous y ajouter."
            actionLabel="Actualiser"
            onAction={reload}
            card={false}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + Space.xxxl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Violet[500]}
              progressViewOffset={insets.top}
            />
          }
        >
          <Hero daara={daara} topInset={insets.top} />

          <View style={styles.body}>
            {!daara ? (
              <LoadingBody />
            ) : (
              <>
                <ChefCard
                  daara={daara}
                  members={members}
                  onWrite={() => router.push("/chat")}
                />

                <Counters daara={daara} campaigns={campaigns} />

                <Talibes
                  members={members}
                  limit={directoryLimit}
                  query={directoryQuery}
                  onQuery={setDirectoryQuery}
                  onToggle={() => {
                    setDirectoryLimit((current) => (current === 0 ? DIRECTORY_PAGE : 0));
                    setDirectoryQuery("");
                  }}
                  onMore={() => setDirectoryLimit((current) => current + DIRECTORY_PAGE)}
                />

                <Chantiers
                  campaigns={campaigns}
                  showsAmounts={showsAmounts}
                  onOpen={(id) => router.push(`/campaign/${id}`)}
                  onSeeAll={() => router.push("/campaigns")}
                  onRetry={reload}
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/*
        Les deux boutons sont ÉPINGLÉS, là où la planche les pose DANS la
        photographie — donc défilants. Passé 236 px, l'utilisateur n'aurait plus
        ni retour ni tiroir. Ton `neutral` pour la même raison qu'au détail d'un
        Ndiguel : un blanc à 92 % disparaîtrait sur le corps blanc, un gris
        clair se lit sur la photographie comme sur le blanc.
      */}
      <View style={[styles.topBar, passThrough, { top: insets.top + Space.sm }]}>
        <IconButton
          icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel="Revenir"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
        />
        <IconButton
          icon={<Menu size={20} color={Ink[900]} strokeWidth={1.6} />}
          accessibilityLabel="Ouvrir le menu"
          onPress={openDrawer}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * La photographie porte le sur-titre et le nom. `topInset` s'AJOUTE à la
 * hauteur dessinée : sans cela la barre d'état mangerait 40 des 236 px et le
 * nom remonterait dans le dégradé.
 */
function Hero({ daara, topInset }: { daara: Daara | null; topInset: number }) {
  /** La zone territoriale et son chef-lieu. `location` est celui de la LDD. */
  const ldd = [daara?.ldd?.name, daara?.ldd?.location].filter(Boolean).join(" · ");

  return (
    <View style={[styles.hero, { height: HERO_HEIGHT + topInset }]}>
      <ExpoImage
        source={HERO_PHOTO}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={ScrimPhoto.colors}
        locations={ScrimPhoto.locations}
        style={[StyleSheet.absoluteFill, noTouch]}
      />

      <View style={styles.heroText}>
        <View style={styles.heroOverlineRow}>
          <Text style={styles.heroOverline}>Mon Daara</Text>
          {/* Un Daara désactivé se dit : le taire ferait passer un Daara clos pour ouvert. */}
          {daara && !daara.is_active ? <Badge label="Inactif" tone="onPhoto" /> : null}
        </View>
        {daara ? (
          <>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {daara.name}
            </Text>
            {ldd ? (
              <Text style={styles.heroLdd} numberOfLines={1}>
                {ldd}
              </Text>
            ) : null}
          </>
        ) : (
          <Skeleton width="70%" height={26} />
        )}
      </View>
    </View>
  );
}

/**
 * Le chef. `chef_full_name` est le seul champ nominatif du sérialiseur : ni
 * portrait, ni identifiant utilisable pour le joindre. Le portrait est donc
 * retrouvé dans l'annuaire par le MÊME cheminement que
 * `DaaraSerializer.get_chef_full_name` — d'abord le chef déclaré sur le Daara,
 * à défaut le premier `chef_daara` rattaché. Deux cheminements qui
 * divergeraient mettraient un visage sur un autre nom.
 */
function ChefCard({
  daara,
  members,
  onWrite,
}: {
  daara: Daara;
  members: DirectoryUser[] | null;
  onWrite: () => void;
}) {
  const name = daara.chef_full_name?.trim();

  if (!name) {
    return (
      <Card>
        <Text style={styles.note}>Aucun chef n&apos;est désigné pour ce Daara.</Text>
      </Card>
    );
  }

  const row =
    members?.find((m) => m.id === daara.chef) ??
    members?.find((m) => m.role === "chef_daara");

  return (
    <Card padded={false} style={styles.chef}>
      <Avatar uri={row?.avatar_url ?? row?.avatar} name={name} size={44} />
      <View style={styles.chefText}>
        <Text style={styles.chefName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.chefRole}>Chef du Daara</Text>
      </View>
      {/*
        « Écrire » mène à la messagerie, pas à une conversation : `comms/`
        n'expose pas d'ouverture par utilisateur. Même arbitrage qu'au détail
        d'un Ndiguel — un bouton qui ne fait rien est pire qu'un bouton absent.
      */}
      <Button
        label="Écrire"
        onPress={onWrite}
        variant="secondary"
        size="md"
        fullWidth={false}
        style={styles.chefWrite}
      />
    </Card>
  );
}

/**
 * Trois compteurs, trois sources distinctes — et c'est le point : aucun n'est
 * calculé à partir d'un autre.
 *
 * ⚠ Le compteur des Ndiguels affiche un TIRET, pas un zéro, quand la liste n'a
 * pas répondu. « 0 Ndiguel actif » sur une coupure réseau est un mensonge, et
 * c'est celui qui ferait renoncer un talibé à contribuer.
 */
function Counters({ daara, campaigns }: { daara: Daara; campaigns: Campaign[] | null }) {
  const active = campaigns?.filter((c) => c.status === "active").length ?? null;

  return (
    <View style={styles.counters}>
      <Counter label="Membres" value={formatNumber(daara.members_count)} />
      <Counter label="Ndiguels actifs" value={active === null ? "—" : formatNumber(active)} />
      <Counter label="Collecteurs" value={formatNumber(daara.collectors.length)} />
    </View>
  );
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <Card padded={false} style={styles.counter}>
      <Text style={styles.counterLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.counterValue}>{value}</Text>
    </Card>
  );
}

/**
 * Les visages, et l'annuaire replié dessous.
 *
 * La planche ne montre que la pile et un lien « Annuaire ». Ce lien n'a AUCUNE
 * destination : il n'existe pas de route d'annuaire dans l'application, et en
 * créer une sortirait de ce lot. Il déplie donc la liste sur place — c'est
 * exactement ce que l'ancien écran affichait en permanence, et c'est la seule
 * façon de retrouver le numéro d'un membre. Replié par défaut : la planche a
 * raison, on ouvre « Mon Daara » pour voir son Daara, pas pour lire 400 lignes.
 *
 * ⚠ « et N autres » se compte sur l'ANNUAIRE, pas sur `members_count`. Les deux
 * chiffres peuvent différer — l'annuaire ne rend que les rôles de la communauté
 * — et mélanger les sources donnerait un reste négatif le jour où ils
 * divergeront pour de bon.
 */
/** En dessous, un champ de recherche gêne plus qu'il n'aide. */
const SEARCH_FROM = 8;

function Talibes({
  members,
  limit,
  query,
  onQuery,
  onToggle,
  onMore,
}: {
  members: DirectoryUser[] | null;
  limit: number;
  query: string;
  onQuery: (next: string) => void;
  onToggle: () => void;
  onMore: () => void;
}) {
  if (members === null) {
    return (
      <View style={styles.section}>
        <SectionTitle title="Les membres" />
        <Text style={styles.note}>L&apos;annuaire n&apos;a pas pu être chargé.</Text>
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.section}>
        <SectionTitle title="Les membres" />
        <Text style={styles.note}>Aucun membre n&apos;est encore rattaché à ce Daara.</Text>
      </View>
    );
  }

  const faces: StackedPerson[] = members.slice(0, FACES).map((m) => ({
    uri: m.avatar_url ?? m.avatar,
    name: fullName(m),
  }));
  const others = members.length - faces.length;

  /*
    Le filtre. Local, et c'est le bon choix ici : l'annuaire est déjà chargé
    entièrement (`getDirectory`), et `DirectoryUserViewSet` le borne déjà au
    Daara pour un talibé. Un aller-retour serveur par frappe coûterait la 3G
    sans rien apprendre de plus.

    Il porte sur le nom ET le numéro : on cherche un membre par son nom, mais
    on vérifie une identité par les derniers chiffres de son téléphone.
  */
  const filtre = query.trim().toLowerCase();
  const chiffres = filtre.replace(/\D/g, "");
  const filtres = filtre
    ? members.filter((m) => {
        const nom = fullName(m).toLowerCase();
        if (nom.includes(filtre)) return true;
        if (chiffres && (m.phone ?? "").replace(/\D/g, "").includes(chiffres)) return true;
        return false;
      })
    : members;

  /* Une recherche montre TOUT ce qu'elle trouve : on ne pagine pas un filtre. */
  const shown = filtre ? filtres : members.slice(0, limit);

  return (
    <View style={styles.section}>
      <SectionTitle
        title="Les membres"
        actionLabel={limit === 0 ? "Annuaire" : "Replier"}
        onAction={onToggle}
      />

      <View style={styles.faces}>
        {/* Pas de `total` : la pastille « +N » ferait doublon avec « et N autres ». */}
        <AvatarStack people={faces} size={40} max={FACES} />
        {others > 0 ? (
          <Text style={styles.facesLabel}>
            {others === 1 ? "et 1 autre" : `et ${formatNumber(others)} autres`}
          </Text>
        ) : null}
      </View>

      {limit > 0 ? (
        <View style={styles.directory}>
          {/*
            La recherche n'apparaît qu'annuaire déplié, et seulement s'il y a
            de quoi chercher. Un champ de filtre au-dessus de quatre noms est
            un obstacle ; au-dessus de quatre cents, c'est le seul chemin.
          */}
          {members.length >= SEARCH_FROM ? (
            <Input
              placeholder="Rechercher un membre"
              value={query}
              onChangeText={onQuery}
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Search size={18} color={Ink[300]} strokeWidth={1.6} />}
              containerStyle={styles.directorySearch}
            />
          ) : null}

          {shown.length === 0 ? (
            <Text style={styles.note}>
              Personne ne correspond à « {query.trim()} ».
            </Text>
          ) : null}

          {shown.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}

          {!filtre && members.length > shown.length ? (
            <Button
              label={`Afficher ${formatNumber(members.length - shown.length)} membres de plus`}
              onPress={onMore}
              variant="secondary"
              size="md"
              style={styles.directoryMore}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Une ligne d'annuaire. Le bouton d'appel n'est pas sur la planche ; il était
 * sur l'ancien écran et il est gardé — un annuaire dont on ne peut pas appeler
 * les entrées n'en est pas un. Il ne paraît que si le numéro existe : `phone`
 * est facultatif côté modèle, un compte peut n'avoir qu'une adresse.
 */
function MemberRow({ member }: { member: DirectoryUser }) {
  const name = fullName(member);
  const phone = member.phone?.trim();

  return (
    <View style={styles.member}>
      <Avatar uri={member.avatar_url ?? member.avatar} name={name} size={40} />
      <View style={styles.memberText}>
        <Text style={styles.memberName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.memberRole} numberOfLines={1}>
          {member.title_name?.trim() || ROLE_LABELS[member.role] || member.role}
        </Text>
      </View>
      {phone ? (
        <IconButton
          icon={<Phone size={18} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel={`Appeler ${name}`}
          onPress={() => {
            /* Pas d'application téléphone — un émulateur, une tablette. */
            Linking.openURL(`tel:${phone}`).catch(() => undefined);
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * « La vie du Daara » — les Ndiguels du Daara, ouverts d'abord, puis par
 * échéance la plus proche. L'échéance ne s'affiche que pour un chantier
 * ouvert : « Chantier achevé · J-42 » n'a pas de sens, et « Clôturé » est déjà
 * dit par l'état.
 */
function Chantiers({
  campaigns,
  showsAmounts,
  onOpen,
  onSeeAll,
  onRetry,
}: {
  campaigns: Campaign[] | null;
  showsAmounts: boolean;
  onOpen: (id: number) => void;
  onSeeAll: () => void;
  onRetry: () => void;
}) {
  if (campaigns === null) {
    return (
      <View style={styles.section}>
        <SectionTitle title="La vie du Daara" />
        <ErrorState
          body="Les Ndiguels de votre Daara n'ont pas pu être chargés."
          onRetry={onRetry}
        />
      </View>
    );
  }

  if (campaigns.length === 0) {
    return (
      <View style={styles.section}>
        <SectionTitle title="La vie du Daara" />
        <EmptyState
          picto={<Hammer size={56} color={Violet[900]} strokeWidth={1.5} />}
          title="Aucun chantier en cours"
          body="Votre Daara n'a pas encore ouvert de Ndiguel. Vous serez prévenu dès qu'un appel est lancé."
        />
      </View>
    );
  }

  const sorted = [...campaigns].sort((a, b) => {
    const openness = Number(b.status === "active") - Number(a.status === "active");
    if (openness !== 0) return openness;
    return (a.deadline ?? "").localeCompare(b.deadline ?? "");
  });
  const overflow = sorted.length > CHANTIERS;

  return (
    <View style={styles.section}>
      <SectionTitle
        title="La vie du Daara"
        actionLabel={overflow ? "Tout voir" : undefined}
        onAction={overflow ? onSeeAll : undefined}
      />
      {sorted.slice(0, CHANTIERS).map((campaign) => (
        <ChantierRow
          key={campaign.id}
          campaign={campaign}
          showsAmounts={showsAmounts}
          onPress={() => onOpen(campaign.id)}
        />
      ))}
    </View>
  );
}

function ChantierRow({
  campaign,
  showsAmounts,
  onPress,
}: {
  campaign: Campaign;
  showsAmounts: boolean;
  onPress: () => void;
}) {
  const countdown = campaign.status === "active" ? formatCountdown(campaign.deadline) : null;
  const meta = [CHANTIER_LABELS[campaign.status], countdown === "Clôturé" ? null : countdown]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      padded={false}
      onPress={onPress}
      accessibilityLabel={campaign.name}
      style={styles.chantier}
    >
      <ExpoImage
        source={campaignVisual(campaign, "square")}
        style={styles.chantierPhoto}
        contentFit="cover"
        transition={160}
      />
      <View style={styles.chantierText}>
        <Text style={styles.chantierName} numberOfLines={2}>
          {campaign.name}
        </Text>
        <Text style={styles.chantierMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {/*
        La somme collectée ne se montre qu'aux rôles qui y ont droit
        (`lib/roles.ts`). Pour un talibé la colonne disparaît, sans texte de
        remplacement : l'état et l'échéance, à gauche, disent déjà où en est le
        chantier.
      */}
      {showsAmounts ? (
        <Text style={styles.chantierAmount} numberOfLines={1}>
          {formatFCFA(campaign.collected_amount)}
        </Text>
      ) : null}
    </Card>
  );
}

function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleLabel}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LoadingBody() {
  return (
    <View style={styles.loading}>
      <Skeleton width="100%" height={72} radius={Radius.card} />
      <View style={styles.counters}>
        <Skeleton height={72} radius={Radius.card} delay={150} style={styles.counter} />
        <Skeleton height={72} radius={Radius.card} delay={150} style={styles.counter} />
        <Skeleton height={72} radius={Radius.card} delay={150} style={styles.counter} />
      </View>
      <Skeleton width={140} height={18} delay={300} />
      <SkeletonListRow />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.alt },
  centered: { flex: 1, paddingHorizontal: GUTTER },

  hero: {
    backgroundColor: Violet[900],
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroText: { paddingHorizontal: GUTTER, paddingBottom: Space.lg, gap: Space.xs },
  heroOverline: {
    ...Type.micro,
    fontFamily: Font.semibold,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.78)",
  },
  heroTitle: { ...Type.greeting, color: "#FFFFFF" },
  heroLdd: { ...Type.label, color: "rgba(255,255,255,0.78)" },
  heroOverlineRow: { flexDirection: "row", alignItems: "center", gap: Space.sm },

  topBar: {
    position: "absolute",
    left: GUTTER,
    right: GUTTER,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  body: { paddingHorizontal: GUTTER, paddingTop: Space.lg, gap: Space.xl },
  loading: { gap: Space.lg },
  note: { ...UIType.stateBody, color: Ink[500] },

  chef: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
  },
  chefText: { flex: 1, minWidth: 0, gap: 2 },
  chefName: { ...UIType.rowTitle, color: Ink[900] },
  chefRole: { ...Type.label, color: Ink[500] },
  chefWrite: { paddingHorizontal: Space.lg },

  counters: { flexDirection: "row", gap: Space.sm },
  counter: { flex: 1, padding: Space.lg, gap: Space.xs },
  counterLabel: { ...Type.micro, color: Ink[500], letterSpacing: 0 },
  /** `amountCard` est le cran 20/700 à chasse fixe — ici un effectif, d'où l'encre. */
  counterValue: { ...Type.amountCard, color: Ink[900] },

  section: { gap: Space.md },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Space.md,
  },
  sectionTitleLabel: { ...Type.cardTitle, color: Ink[900] },
  sectionAction: { fontFamily: Font.bold, fontSize: 12, color: Violet[700] },

  faces: { flexDirection: "row", alignItems: "center", gap: Space.md },
  facesLabel: { ...Type.label, fontFamily: Font.semibold, color: Ink[500], flexShrink: 1 },
  directory: { gap: Space.md },
  directorySearch: { marginBottom: Space.sm },
  directoryMore: { marginTop: Space.xs },

  member: { flexDirection: "row", alignItems: "center", gap: Space.md },
  memberText: { flex: 1, minWidth: 0, gap: 2 },
  memberName: { ...UIType.personName, color: Ink[900] },
  memberRole: { ...Type.label, color: Ink[300] },

  chantier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  chantierPhoto: { width: 60, height: 60, borderRadius: Radius.card, ...continuous },
  chantierText: { flex: 1, minWidth: 0, gap: 3 },
  chantierName: { ...UIType.rowTitle, color: Ink[900] },
  chantierMeta: { ...Type.label, color: Ink[300] },
  chantierAmount: { ...UIType.quickAmount, color: montant },
});
