export type PaymentMethod = "orange_money" | "wave" | "paypal" | "manual";
export type PaymentStatus = "pending" | "confirmed" | "failed";

export interface Donation {
  id: number;
  campaign: number;
  campaign_name?: string;
  donor: number;
  donor_name?: string;
  beneficiary?: number | null;
  beneficiary_name?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  collector?: number | null;
  validated_by?: number | null;
  validated_at?: string | null;
  external_ref?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateDonationPayload {
  campaign: number;
  amount: number;
  payment_method: PaymentMethod;
  beneficiary?: number | null;
}
