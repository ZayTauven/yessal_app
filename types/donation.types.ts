/**
 * Moyens de paiement — ALIGNÉS SUR LE BACKEND.
 *
 * Jeu canonique, `yessal-backend/contributions/models.py` :
 *
 *   orange_money  Orange Money          → Bictorys, validation sur le téléphone
 *   wave          Wave                  → Bictorys, validation sur le téléphone
 *   bictorys      Carte bancaire        → Bictorys, redirection navigateur
 *   virement      Virement bancaire     → instructions par courriel, statut `pending_wire`
 *   manual        Espèces (collecteur)  → hors endpoint de paiement
 *
 * C'est ce que le mobile ÉMET. Rien d'autre.
 */
export type PaymentMethod =
  | "orange_money"
  | "wave"
  | "bictorys"
  | "virement"
  | "manual";

/**
 * Valeurs héritées que la base contient encore (migration 0007) et que l'API
 * peut donc RENVOYER sur des dons anciens. Jamais émises par le mobile.
 * Les écrans d'historique doivent savoir les afficher.
 *
 * ⚠ `paypal` en fait partie : le backend n'a aucun routage pour cette valeur.
 * Le mobile sautait l'initiation du paiement puis affichait « Jëf enregistré »,
 * laissant croire à un paiement inexistant. Retiré le 2026-09-03 — ne pas
 * réintroduire sans routage côté Django.
 */
export type LegacyPaymentMethod =
  | "collector"
  | "visa"
  | "mastercard"
  | "paypal";

/** Ce qu'un don peut porter en lecture : le canonique ou un héritage. */
export type AnyPaymentMethod = PaymentMethod | LegacyPaymentMethod;
export type PaymentStatus = "pending" | "confirmed" | "failed" | "pending_wire";

export interface Donation {
  id: number;
  campaign: number;
  campaign_name?: string;
  donor: number;
  donor_name?: string;
  beneficiary?: number | null;
  beneficiary_name?: string | null;
  amount: number;
  /** Lecture : un don ancien peut porter une valeur héritée. */
  payment_method: AnyPaymentMethod;
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
  external_ref?: string | null;
}
