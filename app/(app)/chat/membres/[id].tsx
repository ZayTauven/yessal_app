/**
 * app/(app)/chat/membres/[id].tsx — les membres d'un salon, et sa modération.
 *
 * Jusqu'au 2026-10-30, le téléphone ne savait rien faire d'un salon existant :
 * ni y ajouter quelqu'un, ni en retirer, ni même le quitter. Tout passait par
 * le web. On y arrive en touchant l'en-tête du salon.
 *
 * ── Le modérateur de salon ──────────────────────────────────────────────────
 *
 * Le créateur l'est d'office ; tout modérateur en nomme d'autres. Il ajoute et
 * retire des membres, mais ne retire ni un autre modérateur ni un admin — seule
 * l'administration le fait. Le serveur tranche (`chat.can_moderate`,
 * `remove-member`) ; l'écran ne fait que ne pas proposer un geste refusé.
 *
 * L'ajout passe par la même recherche que « Nouvelle conversation », avec
 * `pour=salon` : c'est la préférence « invitations aux salons » qui compte.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, LogOut, MoreHorizontal, Search, ShieldCheck, UserPlus } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonListRow } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api";
import { ContentService } from "@/lib/content.service";
import { roleLabelLong } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";
import type { Chat, ChatMember } from "@/types/content.types";
import { GUTTER, HIT, Ink, Radius, Space, Surface, Type, UIType, Violet } from "@/theme";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 350;

type Etat =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; chat: Chat; members: ChatMember[] };

/** La phrase du serveur (`detail`, ou la première erreur de champ), sinon un repli. */
function raison(error: unknown, repli: string): string {
  if (!(error instanceof ApiError)) return "Vérifiez votre connexion, puis réessayez.";
  const data = error.payload as Record<string, unknown> | undefined;
  return (
    (typeof data?.detail === "string" && data.detail) ||
    Object.values(data ?? {})
      .flat()
      .find((v): v is string => typeof v === "string") ||
    repli
  );
}

/** Le Daara sous le nom : sans photo, c'est lui qui départage deux homonymes. */
function sousTitre(m: ChatMember, avecModeration = false): string {
  return [avecModeration && m.is_moderator ? "Modérateur" : null, roleLabelLong(m.role), m.daara_name || "Sans Daara"]
    .filter(Boolean)
    .join(" · ");
}

export default function SalonMembersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = Number(params.id);
  const { user } = useAuthStore();
  const userId = user?.id;
  const estAdmin = user?.role === "admin";

  const [etat, setEtat] = useState<Etat>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  const charger = useCallback(
    () =>
      Promise.all([ContentService.getChatById(chatId), ContentService.getChatMembers(chatId)]).then(
        ([chat, members]) => ({ status: "ready" as const, chat, members }),
      ),
    [chatId],
  );

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      charger()
        .then((next) => actif && setEtat(next))
        .catch(() => actif && setEtat({ status: "failed" }));
      return () => {
        actif = false;
      };
    }, [charger]),
  );

  const recharger = useCallback(() => {
    charger()
      .then(setEtat)
      .catch(() => setEtat({ status: "failed" }));
  }, [charger]);

  // ─── Ajouter ──────────────────────────────────────────────────────────
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatMember[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [choisis, setChoisis] = useState<ChatMember[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Une réponse lente à « Fa » ne doit pas écraser celle de « Fatou ». */
  const ticket = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onQuery = useCallback((next: string) => {
    setQuery(next);
    if (timer.current) clearTimeout(timer.current);
    const q = next.trim();
    if (q.length < MIN_QUERY) {
      ticket.current++;
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const mien = ++ticket.current;
    timer.current = setTimeout(() => {
      ContentService.searchMembers(q, "salon")
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

  const fermerAjout = () => {
    setAjoutOuvert(false);
    setQuery("");
    setResults(null);
    setChoisis([]);
  };

  const presents = useMemo(
    () => new Set(etat.status === "ready" ? etat.members.map((m) => m.id) : []),
    [etat],
  );
  const proposes = (results ?? []).filter((m) => !presents.has(m.id));
  const choisisIds = new Set(choisis.map((m) => m.id));

  const ajouter = async () => {
    if (choisis.length === 0) return;
    setBusy(true);
    try {
      const { added, refused } = await ContentService.addChatMembers(chatId, choisis.map((m) => m.id));
      fermerAjout();
      recharger();
      if (refused > 0) {
        Alert.alert(
          added > 0 ? `${added} ajouté${added > 1 ? "s" : ""}` : "Personne n'a été ajouté",
          `${refused} personne${refused > 1 ? "s n'acceptent" : " n'accepte"} pas d'invitation dans un salon.`,
        );
      }
    } catch (error) {
      Alert.alert("Ajout impossible", raison(error, "Les membres n'ont pas été ajoutés."));
    } finally {
      setBusy(false);
    }
  };

  // ─── Gestes sur un membre ─────────────────────────────────────────────
  const agir = async (geste: () => Promise<void>, echec: string) => {
    setBusy(true);
    try {
      await geste();
      recharger();
    } catch (error) {
      Alert.alert(echec, raison(error, "Réessayez dans un instant."));
    } finally {
      setBusy(false);
    }
  };

  const ouvrirActions = (chat: Chat, m: ChatMember) => {
    const titreSalon = !!chat.audience && Object.values(chat.audience).some((v) => v && v.length);
    /* Mêmes règles que `remove_member` côté serveur. */
    const retirable = !(titreSalon && m.par_audience) && (estAdmin || (!m.is_moderator && m.role !== "admin"));
    const boutons: Parameters<typeof Alert.alert>[2] = [
      {
        text: m.is_moderator ? "Décharger de la modération" : "Nommer modérateur",
        onPress: () =>
          agir(
            () => ContentService.setChatModerator(chatId, m.id, !m.is_moderator),
            "Modération inchangée",
          ),
      },
    ];
    if (retirable) {
      boutons.push({
        text: "Retirer du salon",
        style: "destructive",
        onPress: () =>
          Alert.alert(`Retirer ${m.name} ?`, `${m.name} ne recevra plus les messages de « ${chat.display_name} ».`, [
            { text: "Annuler", style: "cancel" },
            {
              text: "Retirer",
              style: "destructive",
              onPress: () => agir(() => ContentService.removeChatMember(chatId, m.id), "Retrait impossible"),
            },
          ]),
      });
    }
    boutons.push({ text: "Annuler", style: "cancel" });
    Alert.alert(m.name, sousTitre(m, true), boutons);
  };

  const quitter = (chat: Chat) => {
    Alert.alert(
      `Quitter « ${chat.display_name} » ?`,
      "Vous ne recevrez plus ses messages. Pour y revenir, il faudra qu'un modérateur vous y ajoute.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await ContentService.leaveChat(chatId);
              /* Le fil quitté reste dessous dans la pile : on revient à la liste. */
              router.dismissTo("/chat");
            } catch (error) {
              setBusy(false);
              Alert.alert("Impossible de quitter", raison(error, "Réessayez dans un instant."));
            }
          },
        },
      ],
    );
  };

  // ─── Rendu ────────────────────────────────────────────────────────────
  const retour = () => (router.canGoBack() ? router.back() : router.replace(`/chat/${chatId}`));

  if (etat.status !== "ready") {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScreenHeader title="Membres du salon" onBack={retour} />
        {etat.status === "loading" ? (
          <View style={styles.content}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : (
          <ErrorState body="La liste des membres n'a pas pu être chargée." onRetry={recharger} />
        )}
      </SafeAreaView>
    );
  }

  const { chat, members } = etat;
  const peutModerer = chat.can_moderate;
  const titreSalon = !!chat.audience && Object.values(chat.audience).some((v) => v && v.length);
  const moderateurs = members.filter((m) => m.is_moderator);
  const autres = members
    .filter((m) => !m.is_moderator)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const ligne = (m: ChatMember) => {
    const actionnable = peutModerer && m.id !== userId;
    return (
      <Pressable
        key={m.id}
        onPress={actionnable ? () => ouvrirActions(chat, m) : undefined}
        disabled={!actionnable || busy}
        accessibilityRole={actionnable ? "button" : undefined}
        accessibilityLabel={actionnable ? `Gérer ${m.name}` : m.name}
        style={({ pressed }) => [styles.row, pressed && actionnable && styles.rowPressed]}
      >
        <Avatar uri={m.avatar} name={m.name} size={40} />
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {m.name}
            {m.id === userId ? " (vous)" : ""}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {sousTitre(m)}
          </Text>
        </View>
        {m.is_moderator ? <ShieldCheck size={18} color={Violet[700]} strokeWidth={1.6} /> : null}
        {actionnable ? <MoreHorizontal size={18} color={Ink[500]} strokeWidth={1.6} /> : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title="Membres du salon" onBack={retour} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.salon} numberOfLines={2}>
            {chat.display_name}
          </Text>
          <Text style={styles.note}>
            {members.length} membre{members.length > 1 ? "s" : ""}
            {titreSalon ? " · ses membres suivent le titre : qui le reçoit y entre, qui le perd en sort." : ""}
          </Text>
          {chat.archived_at ? <Text style={styles.note}>Salon archivé — lecture seule.</Text> : null}
        </View>

        {peutModerer ? (
          ajoutOuvert ? (
            <View style={styles.ajout}>
              <Input
                label="Ajouter des membres"
                placeholder="Nom, Daara, e-mail ou numéro"
                value={query}
                onChangeText={onQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                icon={<Search size={18} color={Ink[300]} strokeWidth={1.6} />}
              />
              {searching ? (
                <SkeletonListRow />
              ) : results === null ? null : proposes.length === 0 ? (
                <Text style={styles.note}>
                  Personne à ajouter. Un membre qui a restreint sa visibilité n&apos;apparaît pas ici.
                </Text>
              ) : (
                proposes.map((m) => {
                  const pris = choisisIds.has(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setChoisis((p) => (pris ? p.filter((x) => x.id !== m.id) : [...p, m]))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: pris }}
                      accessibilityLabel={m.name}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <Avatar uri={m.avatar} name={m.name} size={40} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {m.name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {sousTitre(m)}
                        </Text>
                      </View>
                      <View style={[styles.case, pris && styles.caseOn]}>
                        {pris ? <Check size={14} color={Surface.default} strokeWidth={2.4} /> : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
              {/* Sous la liste : cocher ne décale pas les lignes sous le doigt. */}
              {choisis.length > 0 ? (
                <Text style={styles.note}>Choisis : {choisis.map((m) => m.name).join(", ")}</Text>
              ) : null}
              <View style={styles.ajoutActions}>
                <Button label="Annuler" variant="ghost" size="md" fullWidth={false} style={styles.ajoutBouton} onPress={fermerAjout} />
                <Button
                  label={choisis.length ? `Ajouter (${choisis.length})` : "Ajouter"}
                  size="md"
                  fullWidth={false}
                  style={styles.ajoutBouton}
                  onPress={ajouter}
                  loading={busy}
                  disabled={busy || choisis.length === 0}
                />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAjoutOuvert(true)} accessibilityRole="button" style={styles.ouvrir}>
              <UserPlus size={20} color={Violet[700]} strokeWidth={1.6} />
              <Text style={styles.ouvrirLabel}>Ajouter des membres</Text>
            </Pressable>
          )
        ) : null}

        {moderateurs.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Modération — {moderateurs.length}</Text>
            {moderateurs.map(ligne)}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Membres — {autres.length}</Text>
          {autres.map(ligne)}
        </View>

        {busy && !ajoutOuvert ? <ActivityIndicator color={Violet[700]} /> : null}

        <Button
          label="Quitter le salon"
          variant="outline"
          icon={<LogOut size={18} color={Ink[900]} strokeWidth={1.6} />}
          onPress={() => quitter(chat)}
          disabled={busy}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.default },
  content: { paddingHorizontal: GUTTER, paddingBottom: Space.xxl, gap: Space.xl },

  intro: { gap: Space.xs },
  salon: { ...Type.cardTitle, color: Violet[900] },
  note: { ...Type.micro, color: Ink[500], lineHeight: 18 },

  block: { gap: Space.xs },
  sectionTitle: { ...Type.label, color: Ink[500], textTransform: "uppercase" },

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

  ouvrir: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    minHeight: HIT + 8,
    paddingHorizontal: Space.lg,
    backgroundColor: Violet[100],
    borderRadius: Radius.input,
  },
  ouvrirLabel: { ...UIType.rowTitle, color: Violet[900] },

  ajout: { gap: Space.md },
  ajoutActions: { flexDirection: "row", gap: Space.sm },
  ajoutBouton: { flex: 1 },
  case: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Ink[300],
    alignItems: "center",
    justifyContent: "center",
  },
  caseOn: { backgroundColor: Violet[700], borderColor: Violet[700] },
});
