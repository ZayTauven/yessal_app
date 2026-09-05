/**
 * app/(app)/profile/settings.tsx — les Paramètres.
 *
 * **Route nouvelle**, créée par le §3.4 du plan : `profile.tsx` faisait 738
 * lignes et mélangeait l'identité, les tutelles, les documents et les réglages.
 * La planche les sépare, et elle a raison — on ne consulte pas son profil et on
 * ne règle pas ses notifications dans le même geste.
 *
 * ── Ce que cet écran règle VRAIMENT ─────────────────────────────────────────
 *
 * Les six préférences de `UserMessagingPreferences` (`comms/models.py:200`),
 * lues et écrites par `GET`/`PATCH /comms/preferences/`. **Ce sont de vrais
 * réglages, pas une maquette** : chaque bascule part au serveur et l'écran se
 * repose sur ce qu'il renvoie.
 *
 * L'ancien écran affichait « Préférences de notifications » derrière une
 * `Alert.alert` qui ne réglait rien. Un interrupteur qui ne commande rien est
 * pire qu'un interrupteur absent : il fait croire à l'utilisateur qu'il s'est
 * mis à l'abri.
 *
 * ── Ce qui n'est PAS ici, et pourquoi ───────────────────────────────────────
 *
 * — **« Sessions actives ».** L'ancien écran promettait de « voir les
 *   connexions ». Le backend n'expose aucune liste de sessions : il n'a que
 *   `User.revoke_sessions()` (`accounts/models.py:183`), appelé de l'intérieur
 *   au changement de mot de passe. La ligne « Changer le mot de passe » le dit
 *   donc en toutes lettres — c'est vrai, et c'est utile.
 * — **La langue.** La planche affiche « Langue · Français ». Rien n'est
 *   traduit : l'application est en français, point. Une ligne qui laisse croire
 *   à un choix qui n'existe pas est un mensonge d'interface. Elle réapparaîtra
 *   le jour où il y aura un wolof à choisir.
 *
 * ── Le refus légitime ───────────────────────────────────────────────────────
 *
 * `visibility` peut revenir en **403** : le chef du Daara peut verrouiller ce
 * réglage (`comms/views.py:358`). Ce n'est pas une panne. L'écran remet la
 * valeur d'avant, le dit, et grise la ligne.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toggle } from "@/components/ui/Toggle";
import { TitleSelectionModal } from "@/components/profile/TitleSelectionModal";
import { ApiError } from "@/lib/api";
import { AuthService } from "@/lib/auth.service";
import { ProfileService } from "@/lib/profile.service";
import { useAuthStore } from "@/store/auth.store";
import type {
  MessagingPreferences,
  MessagingVisibility,
} from "@/types/profile.types";
import type { TitleOption } from "@/types";
import {
  Border,
  Font,
  GUTTER,
  Ink,
  Radius,
  Space,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

const VISIBILITY_LABELS: Record<MessagingVisibility, string> = {
  all: "Tout le monde",
  daara_only: "Mon Daara",
  nobody: "Personne",
};

/** L'ordre du cycle quand on presse la ligne : du plus ouvert au plus fermé. */
const VISIBILITY_CYCLE: MessagingVisibility[] = ["all", "daara_only", "nobody"];

interface State {
  status: "loading" | "ready" | "failed";
  prefs: MessagingPreferences | null;
}

async function fetchPreferences(): Promise<State> {
  try {
    return { status: "ready", prefs: await ProfileService.getPreferences() };
  } catch {
    return { status: "failed", prefs: null };
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [state, setState] = useState<State>({ status: "loading", prefs: null });
  /** La clé en cours d'écriture — elle grise sa ligne, pas tout l'écran. */
  const [pending, setPending] = useState<keyof MessagingPreferences | null>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * La demande de titre, rebranchée en phase F.
   *
   * ⚠ Elle avait disparu avec la scission du §3.4 : `TitleSelectionModal`
   * n'avait plus aucun appelant, alors que le service, les points d'API et
   * l'affichage du titre dans l'annuaire (`daara.tsx`) étaient tous en place.
   * Un membre voyait le titre des autres sans pouvoir demander le sien.
   *
   * Les titres ne sont chargés qu'à l'ouverture de la feuille : c'est une
   * action rare, elle n'a pas à peser sur l'ouverture des Paramètres.
   */
  const [titles, setTitles] = useState<TitleOption[] | null>(null);
  const [titleSheetOpen, setTitleSheetOpen] = useState(false);
  const [loadingTitles, setLoadingTitles] = useState(false);

  /**
   * Un seul changement de titre par membre — la règle vit côté serveur
   * (`accounts/views.py:524`) et le mobile l'ignorait. On la dit AVANT plutôt
   * que de laisser le membre choisir un titre pour recevoir un 400.
   */
  const titleSpent = (user?.title_change_count ?? 0) >= 1;

  const openTitleSheet = useCallback(async () => {
    if (titleSpent) {
      Alert.alert(
        "Changement déjà utilisé",
        "Vous avez utilisé votre unique changement de titre. Le responsable de votre Daara peut encore le modifier pour vous.",
      );
      return;
    }
    if (titles) {
      setTitleSheetOpen(true);
      return;
    }
    setLoadingTitles(true);
    try {
      const options = await AuthService.getTitles();
      setTitles(options.filter((option) => option.is_active));
      setTitleSheetOpen(true);
    } catch {
      Alert.alert(
        "Titres indisponibles",
        "La liste des titres n'a pas pu être chargée. Réessayez plus tard.",
      );
    } finally {
      setLoadingTitles(false);
    }
  }, [titleSpent, titles]);

  const requestTitle = useCallback(async (titleId: number) => {
    try {
      await AuthService.submitTitleRequest(titleId);
      Alert.alert(
        "Demande transmise",
        "Le responsable de votre Daara examinera votre demande.",
      );
    } catch (error) {
      Alert.alert(
        "Demande refusée",
        error instanceof ApiError
          ? error.message
          : "La demande n'a pas pu être transmise.",
      );
      /* Relancé : la feuille ne se ferme que sur un envoi réellement abouti. */
      throw error;
    }
  }, []);

  const load = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchPreferences().then(setState);
  }, []);

  useEffect(() => {
    let active = true;
    fetchPreferences().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  /**
   * Une écriture, une clé. On ne bascule PAS l'affichage avant la réponse :
   * l'interrupteur optimiste est agréable tant qu'il ne ment pas, et ici il
   * mentirait précisément dans le cas qui compte — le réglage verrouillé par le
   * Daara, qui repartirait en arrière sous le doigt.
   */
  const write = useCallback(
    async <K extends keyof MessagingPreferences>(
      key: K,
      value: MessagingPreferences[K],
    ) => {
      if (pending) return;
      setPending(key);
      try {
        const next = await ProfileService.updatePreferences({ [key]: value });
        setState({ status: "ready", prefs: next });
      } catch (error) {
        const forbidden = error instanceof ApiError && error.status === 403;
        Alert.alert(
          forbidden ? "Réglage verrouillé" : "Le réglage n'a pas été enregistré",
          forbidden
            ? "Le chef de votre Daara a fixé ce réglage pour tous les membres."
            : "Vérifiez votre connexion et réessayez.",
        );
      } finally {
        setPending(null);
      }
    },
    [pending],
  );

  const changePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Accès refusé",
        "Autorisez l'accès à vos photos pour changer votre portrait.",
      );
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      /* Un portrait est carré partout dans l'application — autant le cadrer ici. */
      aspect: [1, 1],
      quality: 0.8,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setUploading(true);
    try {
      /* `updateAvatar` monte le `FormData` : une image ne passe pas en JSON. */
      setUser(await AuthService.updateAvatar(picked.assets[0].uri));
    } catch {
      Alert.alert(
        "La photo n'a pas été enregistrée",
        "Réessayez dans un instant.",
      );
    } finally {
      setUploading(false);
    }
  }, [setUser]);

  const { status, prefs } = state;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <IconButton
          /* `ChevronLeft`, et non un `ChevronRight` retourné par
             `transform: scaleX(-1)`. Les icônes lucide sont des SVG
             `react-native-svg` : la transformation ne s'y appliquait pas et le
             bouton retour s'affichait comme un rond gris VIDE (capture du
             2026-09-05). Lucide fournit le chevron gauche, il n'y a rien à
             retourner. */
          icon={<ChevronLeft size={20} color={Ink[900]} strokeWidth={1.5} />}
          accessibilityLabel="Revenir au profil"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
        />
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={changePhoto}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Changer la photo de profil"
          style={styles.identity}
        >
          <View>
            {/* Même défaut qu'au Profil : `avatar_url` seul ignorait la
                photographie TÉLÉVERSÉE, celle que ce bouton même permet de
                choisir. Voir le commentaire de `profile.tsx`. */}
            <Avatar
              uri={user?.avatar_url ?? user?.avatar}
              name={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()}
              size={64}
            />
            <View style={styles.pencil}>
              <Pencil size={13} color={Violet[900]} strokeWidth={2} />
            </View>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityName} numberOfLines={1}>
              {`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Mon compte"}
            </Text>
            <Text style={styles.identityHint}>
              {uploading ? "Envoi en cours…" : "Changer la photo"}
            </Text>
          </View>
        </Pressable>

        {status === "failed" ? (
          <ErrorState
            body="Vos réglages n'ont pas pu être chargés."
            onRetry={load}
            card
          />
        ) : null}

        {status === "loading" ? (
          <View style={styles.loading}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="100%" height={140} radius={Radius.card} />
            <Skeleton width="40%" height={12} />
            <Skeleton width="100%" height={96} radius={Radius.card} />
          </View>
        ) : null}

        {prefs ? (
          <>
            <Group title="Notifications">
              <SwitchRow
                label="Notifications de messages"
                hint="Être prévenu quand on vous écrit."
                value={prefs.notifications_enabled}
                busy={pending === "notifications_enabled"}
                onChange={(v) => write("notifications_enabled", v)}
              />
              <SwitchRow
                label="Seulement si l'on me cite"
                hint="Dans les groupes, ne prévenir que sur mention."
                value={prefs.notify_on_mention_only}
                busy={pending === "notify_on_mention_only"}
                /* Sans notification du tout, la nuance n'a plus d'objet. */
                disabled={!prefs.notifications_enabled}
                onChange={(v) => write("notify_on_mention_only", v)}
                last
              />
            </Group>

            <Group title="Qui peut me joindre">
              <ValueRow
                label="Visible par"
                hint="Qui peut me trouver dans la recherche."
                value={VISIBILITY_LABELS[prefs.visibility]}
                busy={pending === "visibility"}
                onPress={() => {
                  const index = VISIBILITY_CYCLE.indexOf(prefs.visibility);
                  write(
                    "visibility",
                    VISIBILITY_CYCLE[(index + 1) % VISIBILITY_CYCLE.length],
                  );
                }}
              />
              <SwitchRow
                label="Conversations en tête-à-tête"
                hint="Accepter qu'un membre m'écrive directement."
                value={prefs.allow_direct_invites}
                busy={pending === "allow_direct_invites"}
                onChange={(v) => write("allow_direct_invites", v)}
              />
              <SwitchRow
                label="Ajout aux groupes"
                hint="Accepter d'être ajouté à un groupe du Daara."
                value={prefs.allow_group_invites}
                busy={pending === "allow_group_invites"}
                onChange={(v) => write("allow_group_invites", v)}
              />
              <SwitchRow
                label="Statut en ligne"
                hint="Montrer aux autres quand je suis connecté."
                value={prefs.show_online_status}
                busy={pending === "show_online_status"}
                onChange={(v) => write("show_online_status", v)}
                last
              />
            </Group>
          </>
        ) : null}

        <Group title="Compte">
          <LinkRow
            label="Mes informations"
            hint="État civil, adresse — requis par votre Daara."
            onPress={() => router.push("/profile/informations")}
          />
          <LinkRow
            label="Mes documents"
            hint="Pièce d'identité et justificatifs."
            onPress={() => router.push("/profile/documents")}
          />
          <LinkRow
            label="Mes tutelles"
            hint="Les proches pour qui vous faites des Jëfs."
            onPress={() => router.push("/profile/tutelle")}
          />
          <LinkRow
            label={loadingTitles ? "Chargement des titres…" : "Demander un titre"}
            hint={
              titleSpent
                ? `${user?.title_name ?? "Votre titre"} — changement unique déjà utilisé.`
                : user?.title_name
                  ? `Votre titre actuel : ${user.title_name}.`
                  : "Un seul changement possible : le titre est transmis au responsable de votre Daara."
            }
            onPress={openTitleSheet}
          />
          <LinkRow
            label="Changer le mot de passe"
            /* Vrai, et vérifiable : `revoke_sessions()` est appelé au changement. */
            hint="Vos autres appareils seront déconnectés."
            onPress={() => router.push("/forgot")}
            last
          />
        </Group>

        <Group title="À propos">
          <LinkRow
            label="Aide et contact"
            hint="Joindre le responsable de votre Daara."
            onPress={() => router.push("/contact")}
            last
          />
          {/*
            Les pictogrammes de l'onboarding viennent du Noun Project, sous
            licence CC BY : le crédit est DÛ et doit être visible par
            l'utilisateur, pas seulement présent dans le dépôt. Voir
            `assets/pictos/ATTRIBUTION.md`.
          */}
          <Text style={styles.credits}>
            Pictogrammes : Smashing Stocks, Vectors Market et Symbolon, via le
            Noun Project.
          </Text>
        </Group>
      </ScrollView>

      <TitleSelectionModal
        visible={titleSheetOpen}
        onClose={() => setTitleSheetOpen(false)}
        titles={titles ?? []}
        onSelect={requestTitle}
        currentTitle={user?.title_name}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

interface RowShellProps {
  label: string;
  hint?: string;
  disabled?: boolean;
  last?: boolean;
  children: React.ReactNode;
}

function RowShell({ label, hint, disabled, last, children }: RowShellProps) {
  return (
    <View style={[styles.row, !last && styles.rowDivided, disabled && styles.rowDim]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  busy = false,
  disabled = false,
  onChange,
  last,
}: {
  label: string;
  hint?: string;
  value: boolean;
  busy?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}) {
  return (
    <RowShell label={label} hint={hint} disabled={disabled} last={last}>
      <Toggle
        value={value}
        onValueChange={onChange}
        disabled={busy || disabled}
        accessibilityLabel={label}
      />
    </RowShell>
  );
}

function ValueRow({
  label,
  hint,
  value,
  busy = false,
  onPress,
  last,
}: {
  label: string;
  hint?: string;
  value: string;
  busy?: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityHint="Change la valeur"
    >
      <RowShell label={label} hint={hint} disabled={busy} last={last}>
        <Text style={styles.rowValue}>{value}</Text>
        <ChevronRight size={18} color={Ink[300]} strokeWidth={1.5} />
      </RowShell>
    </Pressable>
  );
}

function LinkRow({
  label,
  hint,
  onPress,
  last,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <RowShell label={label} hint={hint} last={last}>
        <ChevronRight size={18} color={Ink[300]} strokeWidth={1.5} />
      </RowShell>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Surface.alt, paddingHorizontal: GUTTER },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingTop: Space.sm,
  },
  /** Un seul chevron dans Lucide : celui de droite, retourné. */
  title: { ...Type.screenTitle, fontSize: 28, lineHeight: 32, color: Violet[900], flex: 1 },

  scroll: { paddingTop: Space.lg, paddingBottom: Space.huge, gap: Space.lg },

  identity: { flexDirection: "row", alignItems: "center", gap: Space.lg },
  pencil: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: Radius.avatar,
    backgroundColor: Violet[300],
    borderWidth: 2,
    borderColor: Surface.alt,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1, gap: 2 },
  identityName: { ...Type.cardTitle, color: Violet[900] },
  identityHint: { ...Type.label, color: Ink[500] },

  loading: { gap: Space.md },

  group: { gap: Space.sm },
  groupTitle: {
    ...Type.micro,
    fontFamily: Font.semibold,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: Ink[300],
  },
  groupCard: {
    borderRadius: Radius.card,
    backgroundColor: Surface.default,
    borderWidth: 1,
    borderColor: Border.hairline,
    paddingHorizontal: Space.lg,
    ...continuous,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingVertical: Space.md,
    minHeight: 60,
  },
  rowDivided: { borderBottomWidth: 1, borderBottomColor: Border.hairline },
  rowDim: { opacity: 0.45 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...UIType.personName, color: Ink[900] },
  rowHint: { ...Type.label, color: Ink[500] },
  rowValue: { ...UIType.chipLabel, color: Violet[700] },

  credits: { ...Type.label, color: Ink[300], paddingVertical: Space.md, lineHeight: 18 },
});
