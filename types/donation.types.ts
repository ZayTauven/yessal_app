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
/**
 * Aligné sur `contributions.Donation.PaymentStatus`. `collected` : un
 * collecteur a l'argent en main, l'administration ne l'a pas encore reçu.
 * `cancelled` : annulé par un administrateur, avec un motif.
 */
export type PaymentStatus =
  | "pending"
  | "pending_wire"
  | "collected"
  | "confirmed"
  | "failed"
  | "cancelled";

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
  collector_name?: string | null;
  validated_by?: number | null;
  validated_at?: string | null;
  external_ref?: string | null;
  /** Le collecteur appelle avant de se déplacer. */
  donor_phone?: string | null;
  donor_daara_name?: string | null;
  collected_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Le compte à créditer par virement, servi par
 * `GET /contributions/bank-account/`.
 *
 * L'écran du virement demandait la référence d'un virement dont il n'avait
 * jamais montré la destination. Django ne les envoyait que par courriel, après
 * coup — inatteignable pour un membre inscrit par téléphone seul.
 *
 * `null` signifie que le serveur a répondu 503 : la configuration manque. On
 * ne montre alors AUCUN champ plutôt qu'un IBAN vide.
 */
export interface BankAccount {
  bank_name: string;
  iban: string;
  bic: string;
  account_name: string;
  reference_format: string;
}

/** `GET /contributions/collecte/` — ce que l'utilisateur peut faire en espèces. */
export interface CollecteStatus {
  /** L'administration n'a pas suspendu la collecte en espèces. */
  active: boolean;
  /** Il peut DEMANDER une collecte : un collecteur couvre sa zone. */
  disponible: boolean;
  raison: "suspendue" | "hors_zone" | null;
}

export interface CreateDonationPayload {
  campaign: number;
  amount: number;
  payment_method: PaymentMethod;
  beneficiary?: number | null;
  external_ref?: string | null;
  /** Le membre au nom duquel un collecteur enregistre. Absent : soi-même. */
  donor?: number;
  /** Nom affiché dans « Les Jëfs du Kourel » — sur consentement, jamais le montant. */
  public_in_channel?: boolean;
}
