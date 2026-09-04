/**
 * lib/format.ts — le formatage des montants, en un seul endroit.
 *
 * `Number.toLocaleString("fr-FR")` était employé au fil des écrans. Deux
 * problèmes : le séparateur qu'il produit dépend de la version d'ICU embarquée
 * (espace insécable étroite U+202F sur les uns, insécable U+00A0 sur les
 * autres), et il produit parfois un séparateur là où la maquette n'en met pas.
 *
 * Le kit dessine « 1 250 000 FCFA » avec une espace fine insécable. On la pose
 * nous-mêmes : le rendu est le même sur tous les appareils, et la chaîne ne se
 * coupe jamais en fin de ligne.
 */

/** Espace fine insécable — U+202F. C'est le séparateur de milliers du kit. */
const THIN_NBSP = "\u202F";

/** 1250000 → « 1 250 000 » */
export function formatNumber(value: number): string {
  const rounded = Math.trunc(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return sign + String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);
}

/** 1250000 → « 1 250 000 FCFA ». Le FCFA n'a pas de décimales. */
export function formatFCFA(value: number): string {
  return `${formatNumber(value)}${THIN_NBSP}FCFA`;
}

/** 0,62 → « 62 % ». Espace insécable avant le signe, comme le veut le français. */
export function formatPercent(ratio: number): string {
  return `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}\u00A0%`;
}

/**
 * Jours restants avant une échéance → « J-10 », « Aujourd'hui », « Clôturé ».
 * `deadline` est la chaîne ISO renvoyée par l'API.
 */
export function formatCountdown(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;

  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(end) - startOfDay(new Date())) / 86_400_000);

  if (days < 0) return "Clôturé";
  if (days === 0) return "Aujourd'hui";
  return `J-${days}`;
}
