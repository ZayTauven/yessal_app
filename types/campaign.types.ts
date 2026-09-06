export type CampaignStatus = "pending" | "active" | "completed" | "inactive";

export interface Campaign {
  id: number;
  name: string;
  description?: string | null;
  goal_amount: number;
  collected_amount: number;
  deadline: string;
  status: CampaignStatus;
  event?: number | null;
  /**
   * Le nom de la fête. **Réparé le 2026-09-04 côté Django** : `fete_name` a été
   * ajouté à `CampaignSerializer` (`events/serializers.py`), et
   * `normalizeCampaign` le lit déjà par son repli `item.fete_name`.
   *
   * Avant cela il valait toujours `null`, et le sur-titre de la photographie du
   * détail d'un Ndiguel — posé en phase D pour y lire la fête — ne s'affichait
   * jamais. Reste `null` pour un Ndiguel qui n'est rattaché à aucune fête,
   * ce qui est un cas légitime.
   */
  event_name?: string | null;
  /** L'identifiant du Daara, servi en clé primaire par `CampaignSerializer`. */
  daara?: number | null;
  /**
   * Le nom du Daara. **Réparé le 2026-09-04 côté Django**, en même temps que
   * `event_name` : `daara_name = CharField(source='daara.name')` a été ajouté à
   * `CampaignSerializer`, comme `DirectoryUserSerializer` le faisait déjà.
   *
   * Auparavant `Meta.fields` ne servait que les clés `daara` et `fete`, deux
   * entiers : le champ valait donc toujours `null`, et `home.tsx` disait
   * « Votre Daara » à tout le monde. Constaté au lot « Mon Daara » en
   * vérifiant les champs contre le sérialiseur — la quatrième fois que ce
   * dépôt se fait prendre par un type écrit de mémoire.
   *
   * Reste `null` pour un Ndiguel sans Daara : la relation est `SET_NULL`.
   */
  daara_name?: string | null;
  /** Ce à quoi sert la collecte. Distinct de `description`, qui raconte. */
  objective?: string | null;
  /** Le chef ou l'organisateur désigné — `CampaignSerializer.get_organizer_name`. */
  organizer_name?: string | null;
  /**
   * Le Daara de l'ORGANISATEUR — à ne pas confondre avec `daara_name`, qui est
   * le Daara CIBLÉ par le Ndiguel et souvent un autre.
   *
   * Un Ndiguel n'appartient pas à un Daara : `daara` est un ciblage facultatif
   * (`AGENTS/tools/03_modeles_donnees.md`), et l'organisateur est choisi pour
   * mener l'opération d'où qu'il vienne.
   */
  organizer_daara_name?: string | null;
  created_at: string;
  updated_at?: string;
  /**
   * La photographie du Ndiguel, téléversée depuis l'administration web.
   *
   * C'est le NOM RÉEL du champ — `events/models.py:39`, rendu par
   * `CampaignSerializer` (`events/serializers.py:57`). Le type déclarait
   * auparavant un champ `image` que le serveur n'envoie pas ; un type qui ment
   * ne produit aucune erreur de compilation, seulement un `undefined`
   * silencieux. Le pis-aller de `lib/campaign-visuals.ts` s'appliquait donc à
   * 100 % des Ndiguels, y compris à ceux qui portaient une photographie.
   *
   * L'URL est rendue absolue par `normalizeCampaign` : c'est la seule frontière
   * où la forme de l'API se traduit, et donc le seul endroit qui doit le faire.
   */
  illustrative_photo?: string | null;
  /**
   * Vrai si CE membre peut gérer le Ndiguel — `can_be_managed_by` côté Django.
   *
   * ⚠ Ce n'est pas « en être l'auteur ». La règle est : `admin` et
   * `chef_daara` toujours ; le responsable désigné tant que la gestion est
   * ouverte. Un talibé qui LANCE un Ndiguel n'en devient pas le responsable —
   * `perform_create` ne pose `organizer` que s'il a été transmis. Il ne peut
   * donc pas en gérer les tâches ensuite.
   */
  is_manageable?: boolean;
  /**
   * Les tâches. ⚠ Le serveur les sert UNIQUEMENT à qui peut gérer le Ndiguel
   * et renvoie `[]` aux autres (`CampaignSerializer.get_todos`). Un tableau
   * vide ne veut donc pas dire « aucune tâche » : il peut vouloir dire « ce
   * n'est pas votre affaire ». C'est `is_manageable` qui tranche.
   */
  todos?: CampaignTodo[];
}

export interface Contributor {
  member_name: string;
  member_id: number;
  daara_name?: string | null;
  campaign_name?: string | null;
  amount: number;
  date: string;
  payment_method: string;
  is_anonymous: boolean;
}

export interface FeteCampaign {
  id: number;
  name: string;
  goal_amount: number | null;
  collected_amount: number;
  progress_pct: number;
  status: string;
  deadline: string;
  daara_name?: string | null;
  organizer_name?: string | null;
}

export interface FeteEtat {
  id: number;
  name: string;
  is_active: boolean;
  description?: string | null;
  date?: string | null;
  recurrence: string;
  total_collected: number;
  donation_count: number;
  campaigns_count: number;
  contributions: Contributor[];
  campaigns: FeteCampaign[];
}

export interface CampaignEtat {
  ndiguel_id: number;
  ndiguel_name: string;
  goal_amount: number;
  collected_amount: number;
  progress_pct: number;
  donation_count: number;
  contributions: Contributor[];
}

/**
 * Lancer un Ndiguel depuis le téléphone.
 *
 * ⚠ QUI PEUT ? Pas seulement les responsables : `IsCampaignOrganizer` ouvre la
 * création à `admin`, `chef_daara`, `collector` ET `member`
 * (`events/views.py:19`, `CAMPAIGN_CREATOR_ROLES`). Seule la tutelle en est
 * exclue. Un talibé peut donc lancer un appel — c'est déjà vrai au tableau de
 * bord, et le mobile ne le savait pas faire.
 *
 * `deadline` au format `AAAA-MM-JJ` : c'est un `DateField`, pas un
 * `DateTimeField`. Envoyer un ISO complet fait un 400.
 *
 * `goal_amount` facultatif, et son absence a un SENS affiché : la fiche montre
 * « Objectif ouvert · chaque contribution compte » au lieu d'une barre.
 */
export interface CreateCampaignPayload {
  name: string;
  deadline: string;
  description?: string | null;
  objective?: string | null;
  goal_amount?: number | null;
  fete?: number | null;
  /** Le statut par défaut du modèle est `pending` ; le web crée en `active`. */
  status?: CampaignStatus;
}

/** Une tâche de Ndiguel — `events/campaign-todos/`. */
export interface CampaignTodo {
  id: number;
  campaign: number;
  title: string;
  description?: string | null;
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}
