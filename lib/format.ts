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

/**
 * Espace INSÉCABLE — U+00A0.
 *
 * On avait d'abord posé l'espace FINE insécable (U+202F), plus juste
 * typographiquement. Constat sur la capture du 2026-09-04 : elle ne rendait
 * pas — « 127 000FCFA » au lieu de « 127 000 FCFA ». Plus Jakarta Sans ne
 * porte pas ce glyphe et la fonte de secours l'avale.
 *
 * U+00A0 est dans toutes les fontes. Ne pas revenir à U+202F sans l'avoir
 * vérifié à l'écran.
 */
export const NBSP = "\u00A0";

/** 1250000 → « 1 250 000 » */
export function formatNumber(value: number): string {
  const rounded = Math.trunc(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return sign + String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 1250000 → « 1 250 000 FCFA ». Le FCFA n'a pas de décimales. */
export function formatFCFA(value: number): string {
  return `${formatNumber(value)}${NBSP}FCFA`;
}

/**
 * Au-delà de dix millions, un montant se resserre dans les cases étroites.
 *
 * Yessal fera transiter des milliards (2026-11-03). Écrit en entier,
 * « 12 500 000 000 FCFA » ne tient pas dans une tuile de demi-largeur ; et
 * comme ses espaces sont insécables, il ne passe pas non plus à la ligne : il
 * se tronquait en « 12 500 0… », un montant faux. Sous le seuil, rien ne
 * change : le nombre exact.
 */
const SEUIL_COMPACT = 10_000_000;

/**
 * 2 250 226 999 → « 2,25 Md » ; 85 187 000 → « 85,18 M » ; 1 250 000 → « 1 250 000 ».
 *
 * TRONQUÉ, jamais arrondi : 1 999 999 999 donne « 1,99 Md », pas « 2 Md ».
 * Un total ne s'annonce jamais plus gros qu'il n'est. À n'employer que là où
 * le montant exact se lit ailleurs, ou au moins dans `accessibilityLabel`.
 */
export function formatNumberCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs < SEUIL_COMPACT) return formatNumber(value);
  const [diviseur, unite] = abs >= 1_000_000_000 ? [1_000_000_000, "Md"] : [1_000_000, "M"];
  /* Diviser par le centième d'unité, et non `(abs / diviseur) * 100` :
     1,15 × 100 vaut 114,999… en virgule flottante, « 1,14 Md » au lieu de 1,15. */
  const centiemes = Math.trunc(abs / (diviseur / 100));
  const entier = Math.trunc(centiemes / 100);
  const decimales = String(centiemes % 100).padStart(2, "0").replace(/0+$/, "");
  const sign = value < 0 ? "-" : "";
  return `${sign}${formatNumber(entier)}${decimales ? `,${decimales}` : ""}${NBSP}${unite}`;
}

/** 2 250 226 999 → « 2,25 Md FCFA ». Voir `formatNumberCompact`. */
export function formatFCFACompact(value: number): string {
  return `${formatNumberCompact(value)}${NBSP}FCFA`;
}

/**
 * La taille d'un grand montant, réduite selon sa longueur.
 *
 * `capacite` : le nombre de caractères qui tiennent à la taille `taille` dans
 * la largeur prévue (mesuré à 375 px). Au-delà, la police diminue en
 * proportion, sans descendre sous 55 % : « 1 999 999 999 FCFA » tient sur une
 * ligne au lieu de déborder de sa carte — les espaces insécables l'empêchent
 * de passer à la ligne. Calculé, et non `adjustsFontSizeToFit` seul : ce
 * dernier n'existe pas sur le web et ne se vérifie qu'à l'appareil.
 */
export function tailleMontant(
  texte: string,
  taille: number,
  capacite: number,
): { fontSize?: number; lineHeight?: number } {
  const echelle = Math.max(Math.min(1, capacite / texte.length), 0.55);
  /* Le montant tient : le style de l'écran reste maître de sa taille. */
  if (echelle === 1) return {};
  const fontSize = Math.floor(taille * echelle);
  return { fontSize, lineHeight: Math.ceil(fontSize * 1.18) };
}

/** 0,62 → « 62 % ». Espace insécable avant le signe, comme le veut le français. */
export function formatPercent(ratio: number): string {
  return `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}\u00A0%`;
}

/**
 * Compte à rebours d'un Ndiguel → « J-10 », « Aujourd'hui », « Ouvre dans 3 j »,
 * « Clôturé ».
 *
 * Les jours viennent du SERVEUR (`days_remaining`, `days_until_open`), comptés
 * sur le jour de Dakar. L'horloge du téléphone peut être fausse, et la
 * diaspora vit sur d'autres fuseaux : elle ne décide pas qu'un Ndiguel est
 * clôturé. Le calcul local ne sert qu'en secours, si une ancienne API ne
 * renvoie pas ces champs — et il lit « 2026-10-09 » comme une date, pas comme
 * minuit UTC, qui tombait la veille dans les Amériques.
 */
export function formatCountdown(campaign: {
  deadline?: string | null;
  status?: string | null;
  days_remaining?: number | null;
  days_until_open?: number | null;
} | null | undefined): string | null {
  if (!campaign?.deadline) return null;
  if (campaign.status === "completed") return "Clôturé";
  if (campaign.status === "pending" && (campaign.days_until_open ?? 0) > 0) {
    return `Ouvre dans ${campaign.days_until_open} j`;
  }

  let days = campaign.days_remaining;
  if (days == null) {
    const [y, m, d] = campaign.deadline.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    const now = new Date();
    days = Math.round(
      (Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000,
    );
    if (days < 0) return "Clôturé";
  }
  if (days === 0) return "Aujourd'hui";
  return `J-${days}`;
}
