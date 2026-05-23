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
