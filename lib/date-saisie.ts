/**
 * lib/date-saisie.ts — les dates que le membre ÉCRIT (`JJ/MM/AAAA`).
 *
 * ── Pourquoi aucun `Date` ne sert à valider ─────────────────────────────────
 *
 * La première version construisait `new Date("1983-06-13T00:00:00")` puis
 * relisait le jour avec `getUTCDate()`. Or une date-heure sans fuseau est lue
 * à l'heure LOCALE du téléphone : à Paris, ce minuit-là vaut 22 h UTC la
 * VEILLE, `getUTCDate()` rend 12, et la date est déclarée invalide. Toutes les
 * dates, pour tous les membres à l'est de Greenwich — c'est-à-dire la diaspora
 * d'Europe — pendant qu'à Dakar (UTC+0) personne ne voyait rien.
 *
 * Un calendrier se vérifie par l'arithmétique, pas par une horloge : ce module
 * ne dépend d'aucun fuseau, et c'est voulu.
 */

/** L'année la plus ancienne qu'on accepte pour une naissance. */
const ANNEE_MIN = 1900;

const NOMS_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function estBissextile(annee: number): boolean {
  return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}

function joursDansMois(annee: number, mois: number): number {
  if (mois === 2) return estBissextile(annee) ? 29 : 28;
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
}

const deux = (n: number) => String(n).padStart(2, "0");

/** La date du jour, en `AAAA-MM-JJ`, au calendrier du téléphone. */
export function isoAujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

/** Groupe les chiffres en JJ/MM/AAAA pendant la frappe. */
export function formatDateInput(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** `AAAA-MM-JJ` → `JJ/MM/AAAA`, ou `""` si rien d'exploitable. */
export function fromIso(iso?: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * « 07/03/1988 » → « 1988-03-07 », ou `null` si cette date n'existe pas au
 * calendrier (31/04, 29/02 d'une année commune, mois 18…). Le jour et le mois
 * peuvent s'écrire sur un chiffre.
 */
export function jjmmaaaaVersIso(saisie: string): string | null {
  const m = saisie.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const jour = Number(m[1]);
  const mois = Number(m[2]);
  const annee = Number(m[3]);
  if (mois < 1 || mois > 12) return null;
  if (jour < 1 || jour > joursDansMois(annee, mois)) return null;
  return `${annee}-${deux(mois)}-${deux(jour)}`;
}

/**
 * Ce qui ne va pas dans une date de naissance, DÈS qu'on peut le dire — ou
 * `""` si rien à redire pour l'instant.
 *
 * Appelée à chaque frappe : un « 43 » est signalé au deuxième chiffre, pas au
 * moment d'enregistrer, et le message nomme la composante fautive au lieu de
 * répéter le format. Une saisie INCOMPLÈTE n'est pas une erreur pendant la
 * frappe ; elle le devient à l'enregistrement (`complete: true`).
 */
export function erreurDateNaissance(
  saisie: string,
  { complete = false }: { complete?: boolean } = {},
): string {
  const chiffres = saisie.replace(/[^0-9]/g, "");
  if (!chiffres) return "";

  if (chiffres.length >= 2) {
    const jour = Number(chiffres.slice(0, 2));
    if (jour < 1 || jour > 31) return "Le jour va de 01 à 31.";
  }
  if (chiffres.length >= 4) {
    const mois = Number(chiffres.slice(2, 4));
    if (mois < 1 || mois > 12) return "Le mois va de 01 à 12.";
  }
  if (chiffres.length < 8) {
    return complete ? "Date incomplète. Écrivez-la en entier, par exemple 07/03/1988." : "";
  }

  const jour = Number(chiffres.slice(0, 2));
  const mois = Number(chiffres.slice(2, 4));
  const annee = Number(chiffres.slice(4, 8));
  const max = joursDansMois(annee, mois);
  if (jour > max) {
    /* « Avril n'a que… » plutôt que « le mois de avril » : l'élision change
       avec le mois (d'avril, d'août, d'octobre), la majuscule non. */
    return mois === 2
      ? `Février ${annee} n'a que ${max} jours.`
      : `${NOMS_MOIS[mois - 1]} n'a que ${max} jours.`;
  }
  if (annee < ANNEE_MIN) return `L'année doit être postérieure à ${ANNEE_MIN}.`;

  /* Les deux chaînes sont au format AAAA-MM-JJ : l'ordre alphabétique EST
     l'ordre chronologique. */
  if (`${annee}-${deux(mois)}-${deux(jour)}` > isoAujourdhui()) {
    return "Cette date est dans le futur.";
  }
  return "";
}
