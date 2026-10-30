import type { UserRole } from "./auth.types";

export type EventRecurrence = "annual" | "quarterly" | "weekly" | "none" | "annual_hijri";
export type MessageTarget = "global" | "daara_only";
export type Urgency = "info" | "warning" | "critical";
export type AnnouncementTargetRole =
  | "all"
  | "admin"
  | "chef_daara"
  | "collector"
  | "member";

/**
 * Une fête — `FeteSerializer` (`events/serializers.py:8`).
 *
 * ⚠ **CINQ CHAMPS ONT ÉTÉ RETIRÉS D'ICI EN PHASE F.** Ce type déclarait
 * `cover_image`, `media`, `is_date_fixed`, `created_by_name` et `updated_at` :
 * **aucun des cinq n'existe**, ni dans `Meta.fields`, ni sur le modèle `Fete`
 * (`events/models.py:8`). Ils n'ont donc jamais rien valu — `normalizeEvent`
 * les fabriquait (`media: []` systématique, `is_date_fixed` déduit de la date,
 * `updated_at` recopié de `created_at`), et `events.tsx` dessinait une
 * photographie de couverture qui ne pouvait pas s'afficher.
 *
 * C'est la SIXIÈME occurrence du même défaut, et la première dans ce sens : le
 * type n'oubliait pas des champs du serveur, il en **inventait**. La règle vaut
 * dans les deux sens — le type et le normalisateur se vérifient contre
 * `Meta.fields`, jamais de mémoire.
 *
 * Et un champ réel manquait : `is_active`, qui distingue une fête maintenue
 * d'une fête retirée du calendrier.
 *
 * `event_date` est le nom local de `date` — `normalizeEvent` fait la
 * traduction, elle est antérieure et conservée.
 */
export interface EventItem {
  id: number;
  name: string;
  description?: string | null;
  /**
   * La PROCHAINE occurrence calculée par le serveur (`prochaine_date`), à
   * défaut la date de référence (`date`). Pour un hebdomadaire, la référence
   * reste figée sur le premier vendredi saisi : c'est la prochaine qui compte.
   */
  event_date?: string | null;
  /** Jours d'ici `event_date`, comptés par le serveur (jour de Dakar). */
  days_until?: number | null;
  recurrence: EventRecurrence;
  is_active: boolean;
  created_by?: number | null;
  created_at: string;
}

/**
 * ── La messagerie, réécrite sur le serializer ────────────────────────────────
 *
 * ⚠ Ce qui suit remplace deux types ÉCRITS À LA MAIN QUI MENTAIENT. `Chat`
 * déclarait `name`, `daara_name` et `created_by` : aucun des trois n'est dans
 * `ChatSerializer.Meta.fields` (`comms/serializers.py:106`). Le nom affiché est
 * calculé côté serveur — `display_name`, qui résout l'autre membre pour un
 * tête-à-tête — et il était donc systématiquement absent : la liste des
 * conversations retombait sur « Discussion » pour TOUTES ses lignes.
 *
 * Au passage, cinq champs que le serveur envoie et que personne ne lisait :
 * `avatar`, `last_message`, `unread_count`, `members_count`, `chat_type`. Le
 * dernier message et la pastille de non-lus étaient recalculés côté client en
 * téléchargeant TOUS les messages de TOUTES les conversations.
 */
export type ChatType = "direct" | "group" | "channel";

/**
 * `UserBriefSerializer` (`comms/serializers.py:27`) — la forme sous laquelle
 * une personne apparaît dans la messagerie. Ce n'est pas le `User` du profil :
 * le nom y est déjà composé, et il n'y a ni statut ni coordonnées.
 */
export interface ChatMember {
  id: number;
  name: string;
  avatar?: string | null;
  daara_name?: string | null;
  role?: UserRole | null;
  /** Titre du membre (AMIR, DIEUWRIGNE…), affiché en étiquette. */
  title?: string | null;
}

/** Le condensé que `ChatSerializer.get_last_message` compose côté serveur. */
export interface ChatLastMessage {
  content: string;
  sent_at: string | null;
  sender_name: string;
  sender_id?: number | null;
  message_type?: MessageType;
  /** Écrit par l'utilisateur courant : la ligne affiche « Vous : ». */
  is_mine?: boolean;
}

export interface Chat {
  id: number;
  chat_type: ChatType;
  /** Nom résolu par le serveur : l'autre membre en direct, le nom du salon en groupe. */
  display_name: string;
  /** Renseigné pour un tête-à-tête seulement — c'est la photo de l'autre membre. */
  avatar?: string | null;
  last_message: ChatLastMessage | null;
  unread_count: number;
  members_count: number;
  /** Sourdine de l'utilisateur courant sur ce fil — aucun push n'en part. */
  is_muted: boolean;
  /** L'interlocuteur d'un tête-à-tête. */
  peer_id?: number | null;
  /** Jusqu'où l'interlocuteur a lu — c'est le « Vu ». Tête-à-tête seulement. */
  peer_last_read_at?: string | null;
  last_activity_at?: string | null;
  created_by?: number | null;
  /** Canaux du Kourel : « guide » (annonces de Sangue Bi) ou « jefs ». */
  channel_kind?: "guide" | "jefs" | null;
  description?: string;
  /** Faux dans un canal pour qui n'en est pas auteur, et partout dans un fil archivé. */
  can_post: boolean;
  /** À qui s'adresse le fil (`comms/audience.py`) ; `null` : tout le Kourel ou composé à la main. */
  audience?: { titles?: number[]; ldds?: number[]; daaras?: number[]; roles?: string[] } | null;
  push_enabled?: boolean;
  show_amounts?: boolean;
  /** Clé d'icône choisie par l'administration — `components/chat/ChannelIcon.tsx`. */
  icon?: string;
  archived_at?: string | null;
  /** Le message épinglé en tête du fil. */
  pinned_message?: { id: number; preview: string; sender_name: string; sent_at: string } | null;
  daara?: number | null;
  campaign?: number | null;
  created_at: string;
}

/** La carte qu'un Jëf confirmé pose dans « Les Jëfs du Kourel ». */
export interface JefCard {
  kind: "jef";
  donation_id: number;
  campaign_id: number;
  campaign_name: string;
  donor: { id: number; name: string; title?: string | null; avatar?: string | null } | null;
  variant: "palier" | "diaspora" | "photo" | "picto";
  picto?: string;
  tone?: "peach" | "yellow" | "teal" | "pink" | "lilac";
  photo_url?: string;
  milestone?: number;
  /** Présent seulement si le donateur a consenti ET que le canal affiche les montants. */
  amount?: number;
}

/** Ce que cite une réponse — `ReplyPreviewSerializer`. */
export interface MessageReplyPreview {
  id: number;
  sender_name: string;
  content: string;
  message_type: MessageType;
  is_deleted: boolean;
}

export type MessageType = "text" | "file" | "system" | "card";

/** Réactions agrégées par emoji — `MessageSerializer.get_reactions`. */
export interface MessageReaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface Message {
  id: number;
  chat: number;
  /**
   * ⚠ C'est un OBJET, pas un identifiant. `MessageSerializer` imbrique
   * `UserBriefSerializer` en lecture seule. L'ancien type déclarait `number`,
   * et l'écran de conversation comparait donc un objet à `user.id` : AUCUNE
   * bulle n'était jamais reconnue comme émise par soi. Toutes s'affichaient
   * à gauche, au nom de « Membre #[object Object] ».
   *
   * Nullable par prudence : `sender` est non-null en base, mais un message
   * poussé par Pusher hors du serializer n'a pas la même garantie.
   */
  sender: ChatMember | null;
  message_type: MessageType;
  content: string;
  /** URL du fichier joint quand `message_type` vaut `file`. */
  file_url?: string | null;
  reply_to?: number | null;
  /**
   * Suppression douce : le serveur remplace le contenu par « Message supprimé »
   * et laisse la ligne. L'écran doit le dire au lieu de rendre une bulle vide.
   */
  is_deleted: boolean;
  reactions: MessageReaction[];
  sent_at: string;
  file_name?: string | null;
  file_size?: number | null;
  /** Une image s'affiche en vignette ; le reste en carte de document. */
  file_is_image?: boolean;
  file_kind?: "image" | "audio" | "video" | "document" | null;
  edited_at?: string | null;
  payload?: JefCard | null;
  reply_preview?: MessageReplyPreview | null;
  /** Message pas encore confirmé par le serveur — absent de tout ce que l'API rend. */
  local?: { status: "sending" | "failed"; imageUri?: string | null; attachment?: Attachment | null; clientId?: string };
  /** Renvoyé par l'événement Pusher : l'identifiant de la bulle optimiste d'origine. */
  client_id?: string | null;
}

/** Un fichier local prêt à partir : photo, document ou note vocale. */
export interface Attachment {
  uri: string;
  name: string;
  mimeType: string;
  kind: "image" | "audio" | "video" | "document";
  size?: number | null;
}

export interface CreateMessagePayload {
  chat: number;
  content: string;
  reply_to?: number | null;
  attachment?: Attachment | null;
  /** Identifiant de la bulle optimiste, renvoyé par l'événement Pusher. */
  client_id?: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  target: MessageTarget;
  daara?: number | null;
  daara_name?: string | null;
  urgency: Urgency;
  target_role: AnnouncementTargetRole;
  is_published: boolean;
  created_at: string;
  expires_at?: string | null;
}

/**
 * Une notification personnelle — `NotificationSerializer` (`comms/serializers.py:25`),
 * servie par `GET /comms/notifications/`.
 *
 * ⚠ **Ce type n'existait pas avant la phase F, et le point d'API n'a jamais été
 * appelé.** `notifications.tsx` affichait des `Announcement` — deux fois, une
 * liste « prioritaires » et une liste « récentes » qui se recouvraient — alors
 * que le modèle `Notification` (`comms/models.py:251`) est précisément ce que
 * la notification poussée dépose (`comms/signals.py:109`). Un membre qui tapait
 * sur une notification Android n'y retrouvait donc jamais ce qu'il venait de
 * recevoir.
 *
 * Le sérialiseur ne sert que cinq champs. Il n'y a **ni type, ni lien, ni
 * cible** : une notification ne peut pas être rendue cliquable vers l'objet
 * qu'elle annonce, et l'inventer serait deviner.
 */
export interface AppNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  /** L'écran qu'ouvre la notification, en chemin web — `routeDepuisUrl`. */
  url?: string | null;
  created_at: string;
}

export interface Tutelle {
  id: number;
  tutor?: number;
  first_name: string;
  last_name: string;
  relation: string;
  linked_user?: number | null;
  /**
   * Renvoyés par `TutelleSerializer` (`accounts/serializers.py:201-217`) via
   * `linked_user`, et manquants ici depuis l'origine. Les deux sont `null`
   * quand la tutelle n'est rattachée à aucun compte — c'est le cas courant.
   */
  avatar_url?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTutellePayload {
  first_name: string;
  last_name: string;
  relation: string;
}

export interface NewsGalleryImage {
  id: number;
  image: string;
  caption?: string;
  order: number;
}

export interface NewsPost {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  cover_image?: string | null;
  youtube_url?: string | null;
  is_published: boolean;
  /**
   * ⚠ **Absent du type jusqu'à la phase F**, alors que
   * `NewsPostSerializer.Meta.fields` le sert (`news/serializers.py:28`).
   *
   * C'est la date qui compte : `NewsPost.Meta.ordering` trie la liste sur
   * `-published_at` (`news/models.py:22`), et les écrans affichaient
   * `created_at`. Un article rédigé en janvier et publié en mars apparaissait
   * donc en tête de liste **daté de janvier** — l'ordre et les dates se
   * contredisaient à l'écran.
   *
   * `null` tant que l'article est un brouillon : le modèle ne le pose qu'au
   * passage à `is_published` (`news/models.py:27`). L'affichage retombe alors
   * sur `created_at`.
   */
  published_at?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
  gallery?: NewsGalleryImage[];
}

export interface AnalyticsKpi {
  title: string;
  value: string;
  change: string;
  icon: string;
}

export interface AnalyticsPoint {
  name: string;
  total: number;
}

export interface AnalyticsResponse {
  role: string;
  kpis: AnalyticsKpi[];
  chartData: AnalyticsPoint[];
  daara?: string | null;
  announcements: Announcement[];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * OUVRIR UNE CONVERSATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Le mobile lisait les fils sans jamais pouvoir en ouvrir un : l'état vide des
 * Messages disait « le chef de votre Daara vous écrira ici », et il fallait
 * passer par le tableau de bord pour qu'un talubé ait le moindre message.
 *
 * ⚠ Un tête-à-tête ne se CRÉE pas. `POST /comms/` ne fait que des GROUPES —
 * `ChatViewSet.create` force `chat_type = GROUP`. Un fil direct naît d'une
 * INVITATION acceptée : `POST /comms/invitations/`, puis
 * `POST /comms/invitations/{id}/accept/` chez le destinataire, qui crée alors
 * le `Chat` DIRECT et ses deux adhésions. C'est un consentement, pas une
 * lourdeur : on n'ouvre pas un fil dans la boîte de quelqu'un sans son accord.
 */

/**
 * Un membre trouvé par `GET /comms/search-members/?q=`.
 *
 * ⚠ C'est EXACTEMENT `ChatMember` — `{id, name, avatar, daara_name, role}`,
 * servi par le même `UserBriefSerializer` (`comms/serializers.py:31`). Un
 * premier jet avait inventé `first_name`, `last_name`, `email` et
 * `avatar_url` : aucun de ces champs n'existe sur cette route, et l'écran
 * aurait affiché « Membre 42 » pour tout le monde, faute de trouver un prénom.
 *
 * C'est la faute que le plan relève à répétition — un type qui ment sur la
 * forme de l'API. On alias plutôt que de recopier : le jour où le serializer
 * bouge, il n'y a qu'un endroit à corriger.
 *
 * Deux choses sont donc déjà faites côté serveur, et il ne faut pas les
 * refaire : `name` retombe sur l'adresse puis le numéro quand l'état civil est
 * vide, et `avatar` résout `avatar` PUIS `avatar_url`.
 */
export type MemberSearchResult = ChatMember;

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

/** `ChatInvitationSerializer`. `sender` et `recipient` sont développés. */
export interface ChatInvitation {
  id: number;
  sender: MemberSearchResult;
  recipient: MemberSearchResult;
  chat?: number | null;
  chat_name?: string | null;
  status: InvitationStatus;
  created_at: string;
  expires_at?: string | null;
}

/**
 * Ce que le pilotage autorise, pour CE membre — `GET /comms/pilotage/`.
 *
 * Un chef de Daara peut fermer la création de groupe ou la recherche
 * hors-Daara. L'écran lit ces drapeaux AVANT de proposer le geste : un bouton
 * qui mène à un 403 est pire qu'un bouton absent.
 */
export interface MessagingPilotage {
  id?: number;
  daara?: number | null;
  daara_name?: string | null;
  allow_cross_daara_search: boolean;
  allow_member_invite: boolean;
  allow_group_creation: boolean;
  allow_invite_accept_decline: boolean;
  allow_member_visibility_setting: boolean;
  allow_file_sharing: boolean;
}

/** Les modes de peuplement d'un salon — `CreateGroupChatSerializer.invite_mode`. */
export type GroupInviteMode =
  | "manual"
  | "daara_all"
  | "daara_members"
  | "daara_collectors"
  | "daara_chefs"
  | "global_chefs"
  | "global_collectors";

export interface CreateGroupChatPayload {
  name: string;
  invite_mode: GroupInviteMode;
  /** Requis en mode `manual`, ignoré autrement. */
  member_ids?: number[];
  daara_id?: number | null;
  campaign_id?: number | null;
}
