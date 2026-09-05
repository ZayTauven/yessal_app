/**
 * app/(app)/chat/new.tsx — ouvrir une conversation.
 *
 * L'écran qui manquait. Jusqu'ici la liste des Messages disait « le chef de
 * votre Daara vous écrira ici » : le mobile savait LIRE les fils, jamais en
 * ouvrir un. Pour qu'un talibé ait un message, il fallait passer par le
 * tableau de bord — la capture de vérification s'appelle littéralement
 * « Message-message ajouter depuis le web ».
 *
 * ── Deux gestes, deux mécaniques différentes ────────────────────────────────
 *
 * **Écrire à quelqu'un.** Un tête-à-tête ne se crée PAS d'autorité :
 * `POST /comms/` force `chat_type = GROUP` quoi qu'on lui envoie. Le fil
 * direct naît d'une invitation acceptée. On envoie donc une demande, et le
 * `Chat` est créé quand l'autre l'accepte. Ce n'est pas une lourdeur du
 * backend : on n'ouvre pas un fil dans la boîte de quelqu'un sans son accord,
 * et le destinataire garde ses préférences de visibilité.
 *
 * **Ouvrir un salon.** Là, un seul appel. Les modes de peuplement font le
 * travail côté serveur — « tout le Daara », « les collecteurs » — plutôt que
 * de faire téléverser quatre cents identifiants depuis un téléphone.
 *
 * ── Ce que l'écran ne propose pas, et pourquoi ──────────────────────────────
 *
 * Le pilotage (`GET /comms/pilotage/`) est lu AVANT de dessiner. Un chef de
 * Daara peut fermer la création de groupe ; le bouton disparaît alors au lieu
 * de mener à un 403 que l'utilisateur lira comme une panne. Même règle pour la
 * recherche : quand elle est bornée au Daara, l'écran le DIT, sinon un membre
 * cherche en vain quelqu'un qu'il sait inscrit.
 *
 * ── L'honnêteté des refus ───────────────────────────────────────────────────
 *
 * Trois refus du serveur sont parfaitement normaux et ne sont pas des pannes :
 * un fil existe déjà, une invitation est déjà partie, le destinataire n'accepte
 * pas les demandes. Chacun a sa phrase. Renvoyer « Erreur 400 » sur « vous vous
 * écrivez déjà » est le genre de message qui fait fermer l'application.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Search, Send, Users } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api";
import { ContentService } from "@/lib/content.service";
import { roleLabelLong } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";
import type {
  GroupInviteMode,
  MemberSearchResult,
  MessagingPilotage,
} from "@/types/content.types";
import { GUTTER, HIT, Ink, Space, Surface, Type, UIType, Violet } from "@/theme";

/**
 * Le serveur ignore les recherches de moins de deux caractères — il renvoie
 * `[]`, pas une erreur. On s'aligne pour ne pas dépenser d'aller-retour.
 */
const MIN_QUERY = 2;

/**
 * Le délai avant de partir chercher. 350 ms : assez pour qu'un nom tapé d'une
 * traite ne déclenche qu'un appel, assez court pour ne pas donner l'impression
 * que l'écran ne répond pas.
 */
const DEBOUNCE_MS = 350;

/** Les modes de peuplement, dans l'ordre où on les emploie réellement. */
const GROUP_MODES: { value: GroupInviteMode; label: string }[] = [
  { value: "daara_all", label: "Tout mon Daara" },
  { value: "daara_members", label: "Les talibés de mon Daara" },
  { value: "daara_collectors", label: "Les collecteurs de mon Daara" },
  { value: "daara_chefs", label: "Les chefs de Daara" },
];

/**
 * `UserBriefSerializer.get_name` retombe DÉJÀ sur l'adresse puis le numéro
 * quand l'état civil est vide. Le repli local ne couvre donc que le cas où le
 * champ arriverait vide — il ne recompose rien.
 */
function memberName(m: MemberSearchResult): string {
  return m.name?.trim() || `Membre ${m.id}`;
}

/**
 * Traduit un refus du serveur en une phrase qui dit quoi faire.
 *
 * `ApiError` porte le corps de la réponse. Django y met soit `detail` (403,
 * `PermissionDenied`) soit une liste sous une clé de champ (400,
 * `ValidationError`) — les deux formes existent sur cette route, il faut
 * savoir lire les deux.
 */
function refusLisible(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "La demande n'est pas partie. Vérifiez votre connexion.";
  }
  const data = error.payload as Record<string, unknown> | undefined;
  const brut =
    (typeof data?.detail === "string" && data.detail) ||
    Object.values(data ?? {})
      .flat()
      .find((v): v is string => typeof v === "string");

  if (!brut) return "La demande n'a pas abouti.";

  /*
    Les deux refus les plus fréquents sont des situations normales. On les
    reformule à la première personne plutôt que de servir la phrase du
    serveur, écrite pour un journal d'administration.
  */
  if (brut.includes("existe déjà")) {
    return "Vous avez déjà une conversation avec ce membre. Elle est dans votre liste.";
  }
  if (brut.includes("en attente")) {
    return "Votre demande est déjà partie. Elle attend une réponse.";
  }
  return brut;
}

export default function NewChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [pilotage, setPilotage] = useState<MessagingPilotage | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<number | null>(null);

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMode, setGroupMode] = useState<GroupInviteMode>("daara_all");
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    let active = true;
    ContentService.getMessagingPilotage().then((cfg) => {
      if (active) setPilotage(cfg);
    });
    return () => {
      active = false;
    };
  }, []);

  /*
    ⚠ LA RECHERCHE N'EST PAS UN EFFET, ET C'EST DÉLIBÉRÉ.

    Un premier jet la synchronisait sur `query` dans un `useEffect`, avec un
    `setSearching(true)` dans le corps. Le React Compiler le refuse
    (`react-hooks/set-state-in-effect`) — c'est le même piège que le plan
    signale à quatre reprises depuis la phase D. Et il a raison sur le fond :
    chercher n'est pas synchroniser un état avec un autre, c'est réagir à une
    frappe. Le geste appartient donc au gestionnaire de saisie.

    Le TICKET remplace le drapeau `active` d'un effet : sans lui, une réponse
    lente à « Fa » revenait APRÈS celle de « Fatou » et réaffichait les
    résultats d'une saisie déjà effacée — exactement le défaut que la reprise
    du web avait corrigé sur la collecte physique.
  */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticket = useRef(0);

  const onQuery = useCallback((next: string) => {
    setQuery(next);
    if (timer.current) clearTimeout(timer.current);

    const q = next.trim();
    if (q.length < MIN_QUERY) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const mien = ++ticket.current;
    timer.current = setTimeout(() => {
      ContentService.searchMembers(q)
        .then((rows) => {
          if (mien === ticket.current) {
            setResults(rows);
            setSearching(false);
          }
        })
        .catch(() => {
          if (mien === ticket.current) {
            setResults([]);
            setSearching(false);
          }
        });
    }, DEBOUNCE_MS);
  }, []);

  /* Le seul effet restant ne fait que nettoyer : aucun `setState` dedans. */
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const invite = useCallback(
    async (member: MemberSearchResult) => {
      setSendingTo(member.id);
      try {
        await ContentService.createInvitation(member.id);
        Alert.alert(
          "Demande envoyée",
          `${memberName(member)} recevra votre demande. La conversation s'ouvrira dès qu'elle sera acceptée.`,
          [{ text: "Entendu", onPress: () => router.back() }],
        );
      } catch (error) {
        Alert.alert("Demande non envoyée", refusLisible(error));
      } finally {
        setSendingTo(null);
      }
    },
    [router],
  );

  /* Hissé hors du `useCallback` : un optionnel chaîné en dépendance empêche
     le compilateur de conserver la mémoïsation. */
  const daaraId = user?.daara_id ?? user?.daara?.id ?? null;

  const createGroup = useCallback(async () => {
    const nom = groupName.trim();
    if (!nom) {
      Alert.alert("Nom manquant", "Donnez un nom au salon pour que les membres le reconnaissent.");
      return;
    }
    setCreatingGroup(true);
    try {
      const chat = await ContentService.createGroupChat({
        name: nom,
        invite_mode: groupMode,
        daara_id: daaraId,
      });
      router.replace(`/chat/${chat.id}`);
    } catch (error) {
      Alert.alert("Salon non créé", refusLisible(error));
      setCreatingGroup(false);
    }
  }, [groupName, groupMode, router, daaraId]);

  /*
    Le repère de portée. Quand le pilotage borne la recherche au Daara, le
    dire est utile : sans cela, un membre cherche en vain quelqu'un d'un autre
    Daara qu'il sait pourtant inscrit, et conclut que l'application est cassée.
  */
  const portee = useMemo(() => {
    if (!pilotage) return "Tapez au moins deux lettres.";
    return pilotage.allow_cross_daara_search
      ? "Nom, adresse e-mail ou numéro. Au moins deux lettres."
      : "Recherche limitée à votre Daara, par décision du responsable.";
  }, [pilotage]);

  const peutInviter = pilotage?.allow_member_invite !== false;
  const peutCreerSalon = pilotage?.allow_group_creation !== false;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel="Revenir"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/chat"))}
        />
        <Text style={styles.title}>Nouvelle conversation</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {peutInviter ? (
          <View style={styles.block}>
            <Input
              label="Écrire à un membre"
              placeholder="Ex. Fatou Niang"
              hint={portee}
              value={query}
              onChangeText={onQuery}
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Search size={18} color={Ink[300]} strokeWidth={1.6} />}
            />

            {searching ? (
              <View style={styles.rows}>
                <SkeletonListRow />
                <SkeletonListRow />
              </View>
            ) : results === null ? null : results.length === 0 ? (
              /*
                « Personne » ne veut pas dire « ce membre n'existe pas ». Le
                serveur filtre sur la visibilité de CHAQUE destinataire : un
                membre absent du résultat a peut-être simplement choisi de ne
                pas être trouvable. Le dire évite de faire chercher en boucle.
              */
              <Text style={styles.note}>
                Personne ne correspond. Un membre qui a restreint sa visibilité
                n&apos;apparaît pas ici — passez par le responsable de votre Daara.
              </Text>
            ) : (
              <View style={styles.rows}>
                {results.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    pending={sendingTo === member.id}
                    disabled={sendingTo !== null}
                    onPress={() => invite(member)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <EmptyState
            picto={<Send size={56} color={Violet[900]} strokeWidth={1.5} />}
            title="Les demandes sont fermées"
            body="Le responsable de votre Daara a désactivé les demandes de conversation. Passez par lui pour être mis en relation."
            card={false}
          />
        )}

        {peutCreerSalon ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Ou ouvrir un salon</Text>

            {groupOpen ? (
              <Card style={styles.group}>
                <Input
                  label="Nom du salon"
                  placeholder="Ex. Organisation du Magal"
                  value={groupName}
                  onChangeText={setGroupName}
                />
                <Select
                  label="Qui rejoint"
                  value={groupMode}
                  options={GROUP_MODES}
                  onSelect={(next) => setGroupMode(next as GroupInviteMode)}
                />
                {/*
                  Pas de sélection manuelle de membres : composer une liste de
                  plusieurs centaines de noms au doigt n'est pas un geste de
                  téléphone. Les modes du serveur font le travail, et on peut
                  toujours inviter quelqu'un ensuite.
                */}
                <Text style={styles.note}>
                  Les membres sont ajoutés par le serveur selon ce choix. Vous
                  pourrez en inviter d&apos;autres ensuite.
                </Text>
                <Button
                  label="Créer le salon"
                  onPress={createGroup}
                  loading={creatingGroup}
                  disabled={creatingGroup}
                />
              </Card>
            ) : (
              <Pressable
                onPress={() => setGroupOpen(true)}
                accessibilityRole="button"
                style={styles.groupOpener}
              >
                <Users size={20} color={Violet[700]} strokeWidth={1.6} />
                <Text style={styles.groupOpenerLabel}>Ouvrir un salon de Daara</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Une ligne de résultat. Toute la ligne est le bouton — la cible est large. */
function MemberRow({
  member,
  pending,
  disabled,
  onPress,
}: {
  member: MemberSearchResult;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const sous = [roleLabelLong(member.role), member.daara_name]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Écrire à ${memberName(member)}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar uri={member.avatar} name={memberName(member)} size={40} />
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {memberName(member)}
        </Text>
        {sous ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {sous}
          </Text>
        ) : null}
      </View>
      {pending ? (
        <ActivityIndicator size="small" color={Violet[700]} />
      ) : (
        <Send size={18} color={Violet[700]} strokeWidth={1.6} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: GUTTER,
    paddingVertical: Space.md,
  },
  title: { ...Type.cardTitle, color: Violet[900] },

  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: Space.xxl,
    gap: Space.xxl,
  },

  block: { gap: Space.lg },
  rows: { gap: Space.xs },

  sectionTitle: { ...Type.label, color: Ink[500], textTransform: "uppercase" },
  note: { ...Type.micro, color: Ink[500], lineHeight: 18 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    minHeight: HIT + 16,
    paddingVertical: Space.sm,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...UIType.rowTitle, color: Ink[900] },
  rowMeta: { ...Type.micro, color: Ink[500] },

  group: { gap: Space.lg },
  groupOpener: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    minHeight: HIT + 8,
    paddingHorizontal: Space.lg,
    backgroundColor: Violet[100],
    borderRadius: 14,
  },
  groupOpenerLabel: { ...UIType.rowTitle, color: Violet[900] },
});
