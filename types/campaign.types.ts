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
}
