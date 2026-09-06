import api from "./api";

import type {
  CreateMessagePayload,
  AnalyticsResponse,
  Announcement,
  AppNotification,
  Chat,
  ChatInvitation,
  ChatMember,
  CreateGroupChatPayload,
  CreateTutellePayload,
  MemberSearchResult,
  MessagingPilotage,
  Daara,
  DaaraCollector,
  DirectoryUser,
  EventItem,
  Message,
  Tutelle,
  NewsPost,
} from "@/types";
import type {
  Campaign,
  CampaignEtat,
  CampaignTodo,
  Contributor,
  CreateCampaignPayload,
  FeteCampaign,
  FeteEtat,
} from "@/types/campaign.types";
import type { BankAccount, CreateDonationPayload, Donation } from "@/types/donation.types";
import { Config } from "@/constants/configs";

type PaginatedResponse<T> = { results?: T[] } | T[];

function unwrapList<T>(data: PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results ?? [];
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return 0;
}

function absoluteMediaUrl(url?: string | null) {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const root = Config.API_URL.replace(/\/api\/?$/, "");
  return `${root}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalizeCampaign(item: any): Campaign {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    goal_amount: toNumber(item.goal_amount),
    collected_amount: toNumber(item.collected_amount),
    deadline: item.deadline,
    status: item.status,
    event: item.event ?? item.fete ?? null,
    event_name: item.event_name ?? item.fete_name ?? null,
    daara: item.daara ?? null,
    daara_name: item.daara_name ?? null,
    objective: item.objective ?? null,
    organizer_name: item.organizer_name ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at ?? undefined,
    /**
     * ⚠ LA LIGNE QUI A COÛTÉ TOUTE LA PHASE D.
     *
     * Elle lisait `item.image ?? item.cover_image`. Le serializer des Ndiguels
     * n'envoie **ni l'un ni l'autre** : le champ s'appelle `illustrative_photo`
     * (`events/models.py:39`, `events/serializers.py:57`). La photographie
     * téléversée depuis l'administration web était donc jetée ici, au seul
     * endroit qui traduit la forme de l'API — et chaque écran en aval
     * concluait, à raison, qu'aucun Ndiguel n'avait d'image.
     *
     * `cover_image` est le nom du champ des ACTUALITÉS (`news/models.py:13`).
     * Il n'a jamais rien signifié pour un Ndiguel ; on ne le garde pas « au
     * cas où » — c'est ce genre de repli qui masque l'erreur suivante.
     */
    illustrative_photo: absoluteMediaUrl(item.illustrative_photo),
    is_manageable: Boolean(item.is_manageable),
    todos: Array.isArray(item.todos) ? item.todos : [],
  };
}

/**
 * ⚠ **CINQ CHAMPS FABRIQUÉS, RETIRÉS EN PHASE F.**
 *
 * Ce normalisateur composait `cover_image`, `media`, `is_date_fixed`,
 * `created_by_name` et `updated_at` à partir de rien : `FeteSerializer`
 * (`events/serializers.py:8`) n'en sert aucun, et le modèle `Fete` n'en porte
 * aucun. `media` valait donc toujours `[]`, `cover_image` toujours `null`, et
 * `events.tsx` réservait la place d'une photographie qui ne venait jamais.
 *
 * Ce qui manquait, à l'inverse : `is_active`. Une fête retirée du calendrier
 * s'affichait comme les autres.
 *
 * `date` → `event_date` : la traduction est antérieure et conservée, le nom
 * local disant mieux ce qu'il porte.
 */
function normalizeEvent(item: any): EventItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    event_date: item.event_date ?? item.date ?? null,
    recurrence: item.recurrence ?? "none",
    is_active: item.is_active ?? true,
    created_by: item.created_by ?? null,
    created_at: item.created_at,
  };
}

function normalizeDonation(item: any): Donation {
  return {
    id: item.id,
    campaign: item.campaign,
    campaign_name: item.campaign_name ?? undefined,
    donor: item.donor ?? undefined,
    donor_name: item.donor_name ?? undefined,
    beneficiary: item.beneficiary ?? null,
    beneficiary_name: item.beneficiary_name ?? null,
    amount: toNumber(item.amount),
    payment_method: item.payment_method,
    payment_status: item.payment_status,
    collector: item.collector ?? null,
    validated_by: item.validated_by ?? null,
    validated_at: item.validated_at ?? null,
    external_ref: item.external_ref ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * ⚠ LA MÊME FAUTE QUE `normalizeCampaign`, sur la messagerie cette fois.
 *
 * Ces deux normalisateurs lisaient des champs que `comms/serializers.py`
 * n'envoie pas — `name`, `daara_name`, `created_by`, `sender_email` — et
 * jetaient tous ceux qu'il envoie. Le détail est au type `Chat`
 * (`types/content.types.ts`). Réécrits sur `Meta.fields`, champ par champ.
 */
function normalizeChatMember(item: any): ChatMember | null {
  if (!item || typeof item !== "object") return null;
  return {
    id: item.id,
    name: item.name ?? "",
    avatar: absoluteMediaUrl(item.avatar),
    daara_name: item.daara_name ?? null,
    role: item.role ?? null,
  };
}

function normalizeChat(item: any): Chat {
  const last = item.last_message;
  return {
    id: item.id,
    chat_type: item.chat_type,
    display_name: item.display_name ?? "",
    avatar: absoluteMediaUrl(item.avatar),
    /*
      Le serveur rend `null` quand la conversation n'a aucun message. On garde
      ce `null` tel quel : c'est ce qui distingue « pas encore de message » de
      « dernier message vide », et l'écran de liste s'appuie dessus.
    */
    last_message: last
      ? {
          content: last.content ?? "",
          sent_at: last.sent_at ?? null,
          sender_name: last.sender_name ?? "",
        }
      : null,
    unread_count: toNumber(item.unread_count),
    members_count: toNumber(item.members_count),
    daara: item.daara ?? null,
    campaign: item.campaign ?? null,
    created_at: item.created_at,
  };
}

function normalizeMessage(item: any): Message {
  return {
    id: item.id,
    chat: item.chat,
    sender: normalizeChatMember(item.sender),
    message_type: item.message_type ?? "text",
    content: item.content ?? "",
    file_url: absoluteMediaUrl(item.file_url),
    reply_to: item.reply_to ?? null,
    is_deleted: Boolean(item.is_deleted),
    reactions: Array.isArray(item.reactions) ? item.reactions : [],
    sent_at: item.sent_at,
  };
}

function normalizeAnnouncement(item: any): Announcement {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    target: item.target,
    daara: item.daara ?? null,
    daara_name: item.daara_name ?? null,
    urgency: item.urgency,
    target_role: item.target_role,
    is_published: Boolean(item.is_published),
    created_at: item.created_at,
    expires_at: item.expires_at ?? null,
  };
}

function normalizeNotification(item: any): AppNotification {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    is_read: Boolean(item.is_read),
    created_at: item.created_at,
  };
}

function normalizeNewsPost(item: any): NewsPost {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt ?? null,
    content: item.content,
    cover_image: absoluteMediaUrl(item.cover_image),
    youtube_url: item.youtube_url ?? null,
    is_published: Boolean(item.is_published),
    /**
     * La date éditoriale, oubliée jusqu'à la phase F. Le serveur trie la liste
     * dessus (`news/models.py:22`) ; l'afficher évite que l'ordre des articles
     * et leurs dates se contredisent. `null` sur un brouillon.
     */
    published_at: item.published_at ?? null,
    created_by: item.created_by ?? null,
    created_by_name: item.created_by_name ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at ?? undefined,
    gallery: Array.isArray(item.gallery)
      ? item.gallery.map((img: any) => ({
          ...img,
          image: absoluteMediaUrl(img.image),
        }))
      : [],
  };
}

/**
 * ⚠ LA QUATRIÈME FOIS. Après les Ndiguels, les conversations et les messages,
 * c'est au tour des tutelles : `TutelleSerializer` (`accounts/serializers.py`)
 * expose `avatar_url` et `phone` — deux `SerializerMethodField` tirés de
 * `linked_user` — et ce normalisateur les jetait.
 *
 * Le type, lui, les déclarait déjà : la phase D les y avait ajoutés en croyant
 * corriger le défaut, sans regarder la frontière qui construit l'objet. Le
 * symptôme : `home.tsx` passe `tutelle.avatar_url` à ses avatars et n'a donc
 * jamais montré autre chose que des initiales, et le Profil aurait fait pareil.
 *
 * La leçon, écrite ici pour la dernière fois : **ce n'est pas le type qu'il
 * faut corriger, c'est le normalisateur — et les deux se vérifient contre
 * `Meta.fields`, pas de mémoire.**
 */
function normalizeTutelle(item: any): Tutelle {
  return {
    id: item.id,
    tutor: item.tutor ?? undefined,
    first_name: item.first_name,
    last_name: item.last_name,
    relation: item.relation,
    linked_user: item.linked_user ?? null,
    /* `null` quand la tutelle n'est rattachée à aucun compte — le cas courant. */
    avatar_url: absoluteMediaUrl(item.avatar_url),
    phone: item.phone ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * Un collecteur du Daara. `DaaraSerializer.get_collectors` rend déjà des URL
 * absolues quand la requête est dans le contexte, et `ProfileView` l'y met.
 * `absoluteMediaUrl` est donc sans effet dans le chemin normal ; il couvre le
 * cas d'un appel fait hors requête, où le serveur renvoie « /media/… ».
 */
function normalizeDaaraCollector(item: any): DaaraCollector {
  return {
    id: item.id,
    first_name: item.first_name ?? "",
    last_name: item.last_name ?? "",
    email: item.email ?? null,
    phone: item.phone ?? null,
    avatar: absoluteMediaUrl(item.avatar),
    avatar_url: absoluteMediaUrl(item.avatar_url),
  };
}

/**
 * Le Daara de l'utilisateur — la frontière où la forme de `DaaraSerializer` se
 * traduit. Il n'y en avait aucune : `getMyDaara` rendait `profile.daara` brut,
 * typé `any`, et l'écran devinait le reste.
 *
 * ⚠ CE NORMALISATEUR NE LAISSE PASSER AUCUNE PHOTOGRAPHIE, et ce n'est pas un
 * oubli : le modèle `Daara` n'en porte pas. Ne pas ajouter ici un `item.image`
 * ou un `item.photo` « au cas où » — c'est exactement le repli qui avait fait
 * disparaître l'image des Ndiguels pendant toute la phase D.
 *
 * `ldd` est TOUJOURS un objet ou `null` : `DaaraSerializer` l'imbrique par
 * `LDDSerializer(read_only=True)`. L'ancien écran tentait les deux formes —
 * objet ou identifiant — et retenait la première qui répondait ; une seule
 * existe.
 */
function normalizeDaara(item: any): Daara {
  return {
    id: item.id,
    name: item.name,
    ldd: item.ldd ?? null,
    chef: item.chef ?? null,
    is_active: Boolean(item.is_active),
    created_at: item.created_at,
    updated_at: item.updated_at,
    /** Tous les rattachés, rôles confondus — `get_members_count` ne filtre pas. */
    members_count: toNumber(item.members_count),
    chef_full_name: item.chef_full_name ?? null,
    collectors: Array.isArray(item.collectors)
      ? item.collectors.map(normalizeDaaraCollector)
      : [],
  };
}

/** Une ligne d'annuaire — `DirectoryUserSerializer`. */
function normalizeDirectoryUser(item: any): DirectoryUser {
  return {
    id: item.id,
    email: item.email ?? null,
    first_name: item.first_name ?? "",
    last_name: item.last_name ?? "",
    phone: item.phone ?? null,
    role: item.role,
    status: item.status,
    daara: item.daara ?? null,
    daara_name: item.daara_name ?? null,
    title_name: item.title_name ?? null,
    avatar: absoluteMediaUrl(item.avatar),
    avatar_url: absoluteMediaUrl(item.avatar_url),
  };
}

/**
 * ── Les deux tableaux de bord `/etat/`, enfin normalisés ────────────────────
 *
 * `getCampaignEtat` et `getFeteEtat` **rendaient le JSON brut coulé dans le
 * type** — `api.get<FeteEtat>(…)`, sans frontière. Or les deux vues composent
 * leur réponse à la main (`events/views.py:88` et `:221`) et y sérialisent les
 * montants **en chaînes** : `str(total_collected)`, `str(c.goal_amount)`, et
 * des `Decimal` que DRF rend eux aussi en chaînes.
 *
 * Le type annonçait `number`. Les écrans compensaient au cas par cas — un
 * `Number(etat.total_collected)` ici, rien là — et une somme de chaînes
 * concatène au lieu d'additionner. La frontière est posée : ce qui sort d'ici
 * est un nombre, une fois pour toutes.
 */
function normalizeContributor(item: any): Contributor {
  return {
    member_name: item.member_name,
    member_id: item.member_id,
    daara_name: item.daara_name ?? null,
    campaign_name: item.campaign_name ?? null,
    amount: toNumber(item.amount),
    date: item.date,
    payment_method: item.payment_method,
    is_anonymous: Boolean(item.is_anonymous),
  };
}

function normalizeFeteEtat(item: any): FeteEtat {
  return {
    id: item.id,
    name: item.name,
    is_active: Boolean(item.is_active),
    description: item.description ?? null,
    date: item.date ?? null,
    /**
     * ⚠ Ce n'est PAS le code de récurrence des autres réponses : la vue rend
     * `get_recurrence_display()`, donc « Annuelle », « Hebdomadaire ». À
     * afficher tel quel, jamais à comparer à `"annual"`.
     */
    recurrence: item.recurrence ?? "",
    total_collected: toNumber(item.total_collected),
    donation_count: toNumber(item.donation_count),
    campaigns_count: toNumber(item.campaigns_count),
    contributions: Array.isArray(item.contributions)
      ? item.contributions.map(normalizeContributor)
      : [],
    campaigns: Array.isArray(item.campaigns)
      ? item.campaigns.map((campaign: any): FeteCampaign => ({
          id: campaign.id,
          name: campaign.name,
          goal_amount: campaign.goal_amount == null ? null : toNumber(campaign.goal_amount),
          collected_amount: toNumber(campaign.collected_amount),
          progress_pct: toNumber(campaign.progress_pct),
          status: campaign.status,
          deadline: campaign.deadline,
          daara_name: campaign.daara_name ?? null,
          organizer_name: campaign.organizer_name ?? null,
        }))
      : [],
  };
}

function normalizeCampaignEtat(item: any): CampaignEtat {
  return {
    ndiguel_id: item.ndiguel_id,
    ndiguel_name: item.ndiguel_name,
    goal_amount: toNumber(item.goal_amount),
    collected_amount: toNumber(item.collected_amount),
    progress_pct: toNumber(item.progress_pct),
    donation_count: toNumber(item.donation_count),
    contributions: Array.isArray(item.contributions)
      ? item.contributions.map(normalizeContributor)
      : [],
  };
}

export const ContentService = {
  async getCampaigns(): Promise<Campaign[]> {
    const data = await api.get<PaginatedResponse<any>>("events/campaigns/");
    return unwrapList(data).map(normalizeCampaign);
  },

  async getCampaignById(id: number): Promise<Campaign> {
    const data = await api.get<any>(`events/campaigns/${id}/`);
    return normalizeCampaign(data);
  },
  
  async getCampaignEtat(id: number): Promise<CampaignEtat> {
    return normalizeCampaignEtat(await api.get<any>(`events/campaigns/${id}/etat/`));
  },

  async getFeteEtat(id: number): Promise<FeteEtat> {
    return normalizeFeteEtat(await api.get<any>(`events/fetes/${id}/etat/`));
  },

  async getEvents(): Promise<EventItem[]> {
    const data = await api.get<PaginatedResponse<any>>("events/fetes/");
    return unwrapList(data).map(normalizeEvent);
  },

  async getDonations(): Promise<Donation[]> {
    const data = await api.get<PaginatedResponse<any>>("contributions/");
    return unwrapList(data).map(normalizeDonation);
  },

  async createDonation(payload: CreateDonationPayload): Promise<Donation> {
    const data = await api.post<any>("contributions/", payload);
    return normalizeDonation(data);
  },

  async payDonation(id: number, payment_method: string, wire_reference?: string): Promise<any> {
    return api.post<any>(`contributions/${id}/pay/`, { payment_method, wire_reference });
  },

  /**
   * Les coordonnées du compte à créditer par virement.
   *
   * Renvoie `null` quand le serveur dit 503 — la configuration bancaire
   * manque. L'appelant montre alors l'écran sans les coordonnées plutôt qu'un
   * IBAN vide, et surtout sans planter : on ne bloque pas une déclaration de
   * virement parce qu'on n'a pas su afficher un encadré.
   */
  async getBankAccount(): Promise<BankAccount | null> {
    try {
      return await api.get<BankAccount>("contributions/bank-account/");
    } catch {
      return null;
    }
  },

  async getChats(): Promise<Chat[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/");
    return unwrapList(data).map(normalizeChat);
  },

  /**
   * Une conversation seule. `ChatViewSet` est un `ModelViewSet` : le détail
   * passe par le même `get_queryset` annoté que la liste, donc `unread_count`
   * et `last_message` y sont aussi.
   */
  async getChatById(id: number): Promise<Chat> {
    return normalizeChat(await api.get<any>(`comms/${id}/`));
  },

  /** `GET comms/{id}/members/` → `UserBriefSerializer`, un par membre. */
  async getChatMembers(id: number): Promise<ChatMember[]> {
    const data = await api.get<PaginatedResponse<any>>(`comms/${id}/members/`);
    return unwrapList(data)
      .map(normalizeChatMember)
      .filter((member): member is ChatMember => member !== null);
  },

  async getMessages(): Promise<Message[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/messages/");
    return unwrapList(data).map(normalizeMessage);
  },

  /**
   * Les messages d'UNE conversation. `MessageViewSet.get_queryset` honore le
   * paramètre `chat` (`comms/views.py:185`) — l'écran de conversation
   * téléchargeait jusqu'ici tous les messages de toutes les discussions dont
   * l'utilisateur est membre, pour n'en garder qu'une part.
   */
  async getChatMessages(chatId: number): Promise<Message[]> {
    const data = await api.get<PaginatedResponse<any>>(`comms/messages/?chat=${chatId}`);
    return unwrapList(data).map(normalizeMessage);
  },

  /**
   * Pose l'horodatage de lecture. C'est lui qui remet `unread_count` à zéro au
   * retour sur la liste — sans cet appel, la pastille de non-lus ne descend
   * jamais.
   */
  async markChatRead(id: number): Promise<void> {
    await api.post(`comms/${id}/read/`);
  },

  async createMessage(payload: CreateMessagePayload): Promise<Message> {
    const data = await api.post<any>("comms/messages/", payload);
    return normalizeMessage(data);
  },

  async getAnnouncements(): Promise<Announcement[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/announcements/");
    return unwrapList(data).map(normalizeAnnouncement);
  },

  /**
   * Les notifications du porteur du jeton. `NotificationViewSet.get_queryset`
   * (`comms/views.py:474`) filtre sur `user` et trie par `-created_at` : la
   * liste arrive déjà dans le bon ordre, et il n'y a rien à filtrer ici.
   */
  async getNotifications(): Promise<AppNotification[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/notifications/");
    return unwrapList(data).map(normalizeNotification);
  },

  /**
   * Marque une notification lue. La vue n'accepte que `get` et `patch`
   * (`http_method_names`, `comms/views.py:472`) — pas de `POST`, pas de `DELETE` :
   * une notification ne se supprime pas depuis le mobile.
   */
  async markNotificationRead(id: number): Promise<AppNotification> {
    return normalizeNotification(
      await api.patch<any>(`comms/notifications/${id}/`, { is_read: true }),
    );
  },

  async getTutelles(): Promise<Tutelle[]> {
    const data = await api.get<PaginatedResponse<any>>("tutelles/");
    return unwrapList(data).map(normalizeTutelle);
  },

  async createTutelle(payload: CreateTutellePayload): Promise<Tutelle> {
    const data = await api.post<any>("tutelles/", payload);
    return normalizeTutelle(data);
  },

  /**
   * Corriger une tutelle.
   *
   * `TutelleViewSet` est un `ModelViewSet` complet et son `get_queryset` est
   * borné à `tutor=request.user` : la modification et la suppression étaient
   * donc disponibles DEPUIS TOUJOURS côté serveur, et le mobile n'exposait que
   * la création. Une faute de frappe dans le nom d'un proche était définitive —
   * un défaut porté au registre depuis la phase E.
   */
  async updateTutelle(
    id: number,
    payload: Partial<CreateTutellePayload>,
  ): Promise<Tutelle> {
    const data = await api.patch<any>(`tutelles/${id}/`, payload);
    return normalizeTutelle(data);
  },

  /**
   * Retirer une tutelle.
   *
   * ⚠ Elle n'emporte AUCUN Jëf : `Donation.beneficiary` est un
   * `SET_NULL`/`PROTECT` côté Django selon les cas, et les dons déjà faits au
   * nom de ce proche restent au registre. Retirer une tutelle, c'est cesser de
   * porter quelqu'un — ce n'est pas effacer ce qu'on a donné pour lui.
   */
  async deleteTutelle(id: number): Promise<void> {
    await api.delete(`tutelles/${id}/`);
  },

  async getAnalytics(): Promise<AnalyticsResponse> {
    return api.get<AnalyticsResponse>("analytics/");
  },

  /**
   * Le Daara du porteur du jeton. `null` est une réponse LÉGITIME — un compte
   * en attente de validation n'est rattaché à rien — et se distingue donc d'un
   * échec réseau, qui lève.
   */
  async getMyDaara(): Promise<Daara | null> {
    const profile = await api.get<any>("profile/");
    return profile?.daara ? normalizeDaara(profile.daara) : null;
  },

  /**
   * L'annuaire de la communauté.
   *
   * ⚠ IL N'EST PAS FILTRÉ PAR DAARA POUR TOUS LES RÔLES. Un `collector` ou un
   * `admin` reçoit toute la communauté (`DirectoryUserViewSet.get_queryset`,
   * `accounts/views.py`). L'appelant qui affiche « les membres de mon Daara »
   * filtre lui-même sur `daara.id`.
   */
  async getDirectory(): Promise<DirectoryUser[]> {
    const data = await api.get<PaginatedResponse<any>>("directory/users/");
    return unwrapList(data).map(normalizeDirectoryUser);
  },

  async getNews(): Promise<NewsPost[]> {
    const data = await api.get<PaginatedResponse<any>>("news/posts/");
    return unwrapList(data).map(normalizeNewsPost);
  },

  async getNewsPost(slug: string): Promise<NewsPost> {
    const data = await api.get<any>(`news/posts/${slug}/`);
    return normalizeNewsPost(data);
  },
  /* ══════════════════════════════════════════════════════════════════════
   * OUVRIR UNE CONVERSATION
   * ══════════════════════════════════════════════════════════════════════ */

  /**
   * Ce que le pilotage autorise pour ce membre.
   *
   * Les écrans lisent ces drapeaux AVANT de proposer un geste. Un chef de
   * Daara peut fermer la création de groupe (`allow_group_creation`) ou la
   * recherche hors-Daara ; proposer le bouton quand même mène à un 403 que
   * l'utilisateur lit comme une panne.
   *
   * En cas d'échec réseau on renvoie le jeu PERMISSIF. Un pilotage
   * injoignable ne doit pas verrouiller l'application : le serveur reste de
   * toute façon l'autorité, il refusera lui-même si c'est le cas.
   */
  async getMessagingPilotage(): Promise<MessagingPilotage> {
    try {
      return await api.get<MessagingPilotage>("comms/pilotage/");
    } catch {
      return {
        allow_cross_daara_search: true,
        allow_member_invite: true,
        allow_group_creation: true,
        allow_invite_accept_decline: true,
        allow_member_visibility_setting: true,
        allow_file_sharing: true,
      };
    }
  },

  /**
   * Chercher un membre à qui écrire.
   *
   * ⚠ Le serveur RENVOIE UNE LISTE VIDE en dessous de deux caractères
   * (`MemberSearchView.get`), il ne renvoie pas d'erreur. On s'arrête donc
   * avant l'appel plutôt que de dépenser un aller-retour sur une 3G pour
   * recevoir `[]`.
   *
   * La liste est déjà filtrée par le serveur selon la visibilité de CHAQUE
   * destinataire et le pilotage du demandeur : un membre absent du résultat
   * n'est pas introuvable, il a choisi de ne pas l'être.
   */
  async searchMembers(query: string): Promise<MemberSearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const data = await api.get<PaginatedResponse<any>>(
      `comms/search-members/?q=${encodeURIComponent(q)}`,
    );
    return unwrapList(data);
  },

  /** Les invitations reçues ET envoyées, tous statuts confondus. */
  async getInvitations(): Promise<ChatInvitation[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/invitations/");
    return unwrapList(data);
  },

  /**
   * Demander un tête-à-tête. Le fil naît à l'acceptation, pas ici.
   *
   * Le serveur refuse en 400 pour deux raisons parfaitement normales — un fil
   * existe déjà, une invitation est déjà en attente — et en 403 si le
   * destinataire ou le pilotage l'interdit. L'appelant traduit ; ce ne sont
   * pas des pannes.
   */
  async createInvitation(recipientId: number): Promise<ChatInvitation> {
    return api.post<ChatInvitation>("comms/invitations/", { recipient: recipientId });
  },

  /** Accepter : crée le `Chat` DIRECT et renvoie le fil, prêt à ouvrir. */
  async acceptInvitation(id: number): Promise<Chat> {
    const data = await api.post<any>(`comms/invitations/${id}/accept/`, {});
    return normalizeChat(data.chat ?? data);
  },

  async declineInvitation(id: number): Promise<void> {
    await api.post(`comms/invitations/${id}/decline/`, {});
  },

  /**
   * Ouvrir un salon.
   *
   * `POST /comms/` ne fait QUE des groupes — `ChatViewSet.create` force
   * `chat_type = GROUP` quoi qu'on envoie. Les modes autres que `manual`
   * peuplent le salon côté serveur (tout le Daara, ses collecteurs, ses
   * chefs…), ce qui évite de téléverser quatre cents identifiants depuis un
   * téléphone.
   */
  async createGroupChat(payload: CreateGroupChatPayload): Promise<Chat> {
    const data = await api.post<any>("comms/", payload);
    return normalizeChat(data);
  },

  /* ══════════════════════════════════════════════════════════════════════
   * LANCER UN NDIGUEL
   * ══════════════════════════════════════════════════════════════════════ */

  /**
   * Créer un Ndiguel.
   *
   * On envoie du JSON et non un `FormData` : la photographie d'illustration
   * n'est pas du périmètre mobile pour l'instant, et `campaignVisual` fournit
   * déjà un visuel de repli authentique quand le Ndiguel n'en porte pas.
   *
   * `status: "active"` explicitement — le modèle crée en `pending`, ce qui
   * masquerait le Ndiguel de l'accueil (`home.tsx` ne garde que les actifs).
   * Le tableau de bord fait exactement le même choix.
   */
  async createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
    const data = await api.post<any>("events/campaigns/", {
      status: "active",
      ...payload,
    });
    return normalizeCampaign(data);
  },

  async addCampaignTodo(campaignId: number, title: string): Promise<CampaignTodo> {
    return api.post<CampaignTodo>("events/campaign-todos/", {
      campaign: campaignId,
      title,
      is_completed: false,
    });
  },

  async toggleCampaignTodo(todoId: number, isCompleted: boolean): Promise<CampaignTodo> {
    return api.patch<CampaignTodo>(`events/campaign-todos/${todoId}/`, {
      is_completed: isCompleted,
    });
  },
};
