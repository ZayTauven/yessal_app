export type UserRole =
  | "admin"
  | "chef_daara"
  | "collector"
  | "member"
  | "tutelle";

export type UserStatus = "pending" | "active" | "inactive" | "blocked";

export interface LDDOption {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  location?: string | null;
  is_active: boolean;
}

/**
 * Le Daara servi au formulaire d'INSCRIPTION, par `/api/daara/` appelé sans
 * jeton — donc par `PublicDaaraSerializer` (`accounts/serializers.py`), qui ne
 * monte que trois champs : `id`, `name`, `ldd`.
 *
 * ⚠ TOUT LE RESTE DE CETTE INTERFACE EST UN MENSONGE, et l'un des champs coûte
 * cher : `is_active` n'est PAS envoyé par la vue publique. `register.tsx` filtre
 * pourtant dessus (`items.filter((item) => item.is_active)`) — `undefined` est
 * faux, donc la liste se vide et l'écran affiche « Aucun Daara actif trouvé
 * pour cette localité » quel que soit le contenu de la base. Signalé au lot
 * « Mon Daara » du 2026-09-04 ; la correction est dans `register.tsx`, hors du
 * périmètre de ce lot.
 *
 * Les champs `code`, `description` et `updated_at` ne sont ni dans
 * `PublicDaaraSerializer` ni dans `DaaraSerializer` : `code` et `description`
 * n'existent même pas sur le modèle `Daara` (`accounts/models.py`).
 *
 * Pour le Daara de l'utilisateur connecté, voir `Daara` ci-dessous — c'est une
 * autre forme, servie par un autre sérialiseur.
 */
export interface DaaraOption {
  id: number;
  name: string;
  /** ⚠ Objet `{ id, code, name }`, jamais une chaîne. */
  ldd?: LDDBrief | string | null;
  /** @deprecated Absent de `PublicDaaraSerializer`. Voir l'avertissement ci-dessus. */
  is_active?: boolean;
  /** @deprecated Le modèle `Daara` ne porte pas ce champ. */
  code?: string;
  /** @deprecated Le modèle `Daara` ne porte pas ce champ. */
  description?: string | null;
  ldd_id?: number;
  chef?: number | null;
  created_at?: string;
  updated_at?: string;
}

/** La zone territoriale réduite — `LDDBriefSerializer`. */
export interface LDDBrief {
  id: number;
  code: string;
  name: string;
}

/**
 * Un collecteur du Daara, tel que `DaaraSerializer.get_collectors` le compose
 * à la main. Ce n'est pas un `User` : le sérialiseur ne monte que ces sept
 * champs, et le rôle n'en fait pas partie — la requête filtre déjà sur
 * `Role.COLLECTOR`, il est donc implicite.
 */
export interface DaaraCollector {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
}

/**
 * Le Daara de l'utilisateur connecté — `DaaraSerializer.Meta.fields`
 * (`accounts/serializers.py`), servi imbriqué dans `GET /api/profile/`.
 *
 * ⚠ CE QUE LE SERVEUR N'ENVOIE PAS, et qu'il ne faut donc pas dessiner :
 *   — aucune PHOTOGRAPHIE, aucune image : le modèle `Daara`
 *     (`accounts/models.py`) porte `name`, `ldd`, `chef`, `is_active` et les
 *     deux horodatages, rien d'autre ;
 *   — aucune DESCRIPTION. L'ancien écran « Mon Daara » affichait une carte
 *     « Description » qui ne pouvait, structurellement, dire que « Aucune
 *     description disponible » ;
 *   — aucun CODE de Daara. Le code lisible est celui de la LDD (`ldd.code`) ;
 *   — aucune ADRESSE. `ldd.location` est celle de la zone, pas du Daara ;
 *   — aucun compteur de Ndiguels. Il se dérive côté client de
 *     `GET /api/events/campaigns/`, filtré sur `campaign.daara`.
 *
 * `members_count` compte TOUS les utilisateurs rattachés — talibés, chef et
 * collecteurs confondus (`get_members_count` ne filtre pas sur le rôle).
 * L'appeler « talibés » le surestimerait de quelques unités.
 */
export interface Daara {
  id: number;
  name: string;
  ldd?: LDDOption | null;
  /** L'identifiant du chef, pas son objet. Son nom est dans `chef_full_name`. */
  chef?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members_count: number;
  chef_full_name?: string | null;
  collectors: DaaraCollector[];
}

/** Le Daara réduit que porte chaque ligne d'annuaire — `DirectoryDaaraBriefSerializer`. */
export interface DirectoryDaaraBrief {
  id: number;
  name: string;
  ldd_code?: string | null;
  ldd_name?: string | null;
}

/**
 * Une ligne de `GET /api/directory/users/` — `DirectoryUserSerializer`.
 *
 * ⚠ LE FILTRAGE PAR DAARA N'EST PAS GARANTI. `DirectoryUserViewSet.get_queryset`
 * ne restreint au Daara de l'appelant que pour les rôles `member` et
 * `chef_daara` ; un `collector` ou un `admin` reçoit TOUTE la communauté. Tout
 * écran qui compte ou montre « les membres de mon Daara » doit donc filtrer
 * lui-même sur `daara.id`.
 */
export interface DirectoryUser {
  id: number;
  email?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  daara?: DirectoryDaaraBrief | null;
  daara_name?: string | null;
  title_name?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  /** ⚠ `DaaraSerializer`, pas `PublicDaaraSerializer` : deux formes distinctes. */
  daara?: Daara | null;
  daara_id?: number;
  daara_name?: string;
  avatar_url?: string | null;
  avatar?: string | null;
  last_active_at?: string | null;

  /**
   * ── Le titre — corrigé en phase F ─────────────────────────────────────────
   *
   * ⚠ `title` était déclaré `string | null`. `UserSerializer`
   * (`accounts/serializers.py:333`) le sert comme un **objet imbriqué**
   * (`MemberTitleSerializer`). Tout écran l'affichant aurait rendu
   * `[object Object]` — c'est le même défaut que `MessageSerializer.sender`,
   * trouvé en phase E. Aucun ne l'affichait, ce qui est la seule raison pour
   * laquelle personne ne l'a vu.
   *
   * `title_name` est la chaîne prête à afficher, servie à côté.
   *
   * ⚠ `title_change_count` porte une RÈGLE MÉTIER que le mobile ignorait :
   * `TitleRequestViewSet.perform_create` (`accounts/views.py:524`) refuse toute
   * demande dès qu'il vaut 1 — **un seul changement de titre dans une vie**. Un
   * membre l'ayant déjà utilisé pouvait ouvrir la feuille, choisir, soumettre,
   * et ne recevoir qu'un 400 brut. Les Paramètres le disent maintenant avant.
   */
  title?: TitleOption | null;
  title_name?: string | null;
  title_change_count?: number;
  title_changed_at?: string | null;

  // Additional Profile Fields
  birth_date?: string | null;
  gender?: "male" | "female" | "other" | null;
  residence_country?: string | null;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  zip_code?: string | null;
  marital_status?: "single" | "married" | "divorced" | "widowed" | null;
  blood_type?: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResponse extends AuthTokens {
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface RegisterPayload {
  email?: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  daara_id: number;
}

export interface RegisterResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  daara_id: number;
  status: UserStatus;
  role: UserRole;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  title?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  residence_country?: string | null;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  zip_code?: string | null;
  marital_status?: string | null;
  blood_type?: string | null;
}

export interface TitleOption {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface TitleRequest {
  id: number;
  user: number;
  title: number;
  title_name?: string;
  status: "pending" | "approved" | "refused";
  note?: string;
  updated_at: string;
}

export type DocumentStatus = "pending" | "validated" | "rejected";

/**
 * Une pièce d'identité — `UserDocumentSerializer` (`accounts/serializers.py:282`).
 *
 * Trois champs que le serveur sert et que ce type oubliait, ajoutés en phase F :
 * `type_display` (le libellé humain du type, calculé côté serveur),
 * `submitted_at` et `updated_at`. Le premier évite de recopier la table des
 * libellés ; le second répond à la seule question d'un membre dont la pièce est
 * « en attente » : **depuis quand ?**
 *
 * `validated_by` et `validated_at` restent volontairement absents : ils ne
 * regardent que l'administration.
 */
export interface UserDocument {
  id: number;
  doc_type: string;
  /** Libellé rendu par `get_doc_type_display()`. */
  type_display?: string;
  image?: string | null;
  image_verso?: string | null;
  status: DocumentStatus;
  rejection_note?: string | null;
  doc_number?: string | null;
  submitted_at?: string | null;
  updated_at?: string | null;
}
