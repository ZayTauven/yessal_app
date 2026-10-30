/**
 * lib/donation-display.ts — comment un Jëf se DIT à l'écran.
 *
 * Libellés, couleurs et logos vivaient dans `app/(app)/donations.tsx`. Le reçu
 * (`app/(app)/donation/[id].tsx`) en a besoin à l'identique : deux copies
 * auraient fini par dire deux choses différentes du même Jëf.
 */
import type { AnyPaymentMethod, Donation, PaymentStatus } from "@/types/donation.types";
import { Ink, Status } from "@/theme";

/**
 * L'historique remonte aussi des dons anciens : les valeurs héritées
 * (`LegacyPaymentMethod`) restent ici, elles ne sont plus émises mais elles
 * sont en base.
 */
export const PAYMENT_LOGOS: Partial<Record<AnyPaymentMethod, number>> = {
  orange_money: require("@/assets/images/orange money.png"),
  wave: require("@/assets/images/wave.png"),
  bictorys: require("@/assets/images/carte-paiement.png"),
  virement: require("@/assets/images/banque.png"),
  manual: require("@/assets/images/collecteur.png"),
  collector: require("@/assets/images/collecteur.png"),
  visa: require("@/assets/images/carte-paiement.png"),
  mastercard: require("@/assets/images/mastercard.png"),
  paypal: require("@/assets/images/pay-pal.png"),
};

export const METHOD_LABELS: Record<AnyPaymentMethod, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  bictorys: "Carte bancaire",
  virement: "Virement",
  manual: "Collecteur",
  collector: "Collecteur",
  visa: "Carte bancaire",
  mastercard: "Carte bancaire",
  paypal: "PayPal",
};

/**
 * Le libellé d'un moyen de paiement reçu en texte brut (états de Ndiguel,
 * listes d'événement), où le type n'est pas garanti : une valeur inconnue
 * s'affiche telle quelle plutôt que de disparaître.
 */
export function methodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return METHOD_LABELS[method as AnyPaymentMethod] ?? method;
}

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  failed: "Échoué",
  pending_wire: "Virement en attente",
  collected: "Encaissé, à remettre",
  cancelled: "Annulé",
};

export const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: Status.warning,
  confirmed: Status.success,
  failed: Status.error,
  pending_wire: Status.info,
  collected: Status.info,
  cancelled: Ink[500],
};

/** Remis en main propre : le circuit passe par un collecteur. */
export function isCashJef(donation: Pick<Donation, "payment_method">): boolean {
  return donation.payment_method === "manual" || donation.payment_method === "collector";
}

/**
 * La référence que le courriel de reçu imprime (`contributions/views.py`,
 * `'reference': f'REF-{donation.pk}'`). L'écran dit la même : un membre qui la
 * cite doit parler du même Jëf, qu'il lise son courriel ou l'application.
 */
export function jefReference(donation: Pick<Donation, "id">): string {
  return `REF-${donation.id}`;
}
