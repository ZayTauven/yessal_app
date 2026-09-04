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
  event_name?: string | null;
  daara?: number | null;
  daara_name?: string | null;
  created_at: string;
  updated_at?: string;
  /**
   * La photographie du Ndiguel, téléversée depuis l'administration web.
   * C'est le NOM RÉEL du champ — `events/models.py:39`, rendu par
   * `CampaignSerializer` (`events/serializers.py:57`).
   */
  illustrative_photo?: string | null;
  /**
   * ⚠ N'EXISTE PAS dans la réponse de l'API. Déclaré ici par erreur, il a fait
   * croire pendant toute la phase D qu'aucun Ndiguel ne portait d'image : le
   * code lisait `campaign.image`, toujours `undefined`, et le pis-aller de
   * `lib/campaign-visuals.ts` s'appliquait à 100 % des Ndiguels — y compris à
   * ceux qui avaient bel et bien une photographie.
   *
   * Conservé le temps que `app/(app)/campaign/[id].tsx` passe au système de la
   * refonte ; c'est le dernier écran à le lire. **À supprimer ensuite** —
   * laisser un champ fantôme dans un type, c'est reposer le piège.
   *
   * @deprecated lire `illustrative_photo`.
   */
  image?: string | null;
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
