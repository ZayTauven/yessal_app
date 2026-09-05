/**
 * lib/dial-codes.ts — les indicatifs téléphoniques, pour le sélecteur de pays.
 *
 * ── Pourquoi une table et pas une bibliothèque ──────────────────────────────
 *
 * Le web emploie `react-phone-input-2`, qui ne fonctionne que dans un DOM.
 * L'équivalent React Native serait `libphonenumber-js` — et le backend a
 * **explicitement refusé** d'ajouter `phonenumbers` pour la même fonction
 * (`core/phone.py`, en tête : « la bibliothèque n'est pas dans
 * `requirements.txt`, et le projet est en phase de déploiement : y ajouter une
 * dépendance n'est pas une décision qui se prend en passant »). Prendre côté
 * mobile la décision que le backend a écartée serait incohérent.
 *
 * Cette table MET EN FORME, elle ne certifie pas. C'est exactement la position
 * du serveur : `normalize_phone` vérifie la plage E.164 — 6 à 15 chiffres,
 * indicatif compris — et rien de plus. Le juge reste `LoginSerializer`.
 *
 * ── Le drapeau n'est pas stocké ─────────────────────────────────────────────
 *
 * Il se DÉRIVE du code ISO 3166-1 alpha-2 : deux lettres converties en
 * indicateurs régionaux Unicode. Cent trente emoji recopiés à la main, ce sont
 * cent trente occasions de se tromper, et autant d'octets pour rien.
 */

import { NBSP } from "./format";

/** `[code ISO, nom en français, indicatif sans le « + »]` */
type Entry = readonly [string, string, string];

/**
 * ⚠ Liste large, pas exhaustive : tous les pays d'Afrique, d'Europe et
 * d'Amérique du Nord, le Golfe, et les destinations de diaspora courantes.
 * Un pays absent n'enferme personne — l'écran de connexion garde la saisie
 * libre par adresse e-mail, et l'inscription accepte un numéro écrit avec son
 * indicatif. Ajouter une ligne ici suffit.
 */
const ENTRIES: readonly Entry[] = [
  // ── Afrique de l'Ouest — le cœur de la confrérie ──────────────────────────
  ["SN", "Sénégal", "221"],
  ["ML", "Mali", "223"],
  ["MR", "Mauritanie", "222"],
  ["GM", "Gambie", "220"],
  ["GN", "Guinée", "224"],
  ["GW", "Guinée-Bissau", "245"],
  ["CI", "Côte d'Ivoire", "225"],
  ["BF", "Burkina Faso", "226"],
  ["NE", "Niger", "227"],
  ["TG", "Togo", "228"],
  ["BJ", "Bénin", "229"],
  ["GH", "Ghana", "233"],
  ["NG", "Nigeria", "234"],
  ["SL", "Sierra Leone", "232"],
  ["LR", "Liberia", "231"],
  ["CV", "Cap-Vert", "238"],
  // ── Reste de l'Afrique ────────────────────────────────────────────────────
  ["MA", "Maroc", "212"],
  ["DZ", "Algérie", "213"],
  ["TN", "Tunisie", "216"],
  ["LY", "Libye", "218"],
  ["EG", "Égypte", "20"],
  ["CM", "Cameroun", "237"],
  ["GA", "Gabon", "241"],
  ["CG", "Congo", "242"],
  ["CD", "Congo (RDC)", "243"],
  ["TD", "Tchad", "235"],
  ["CF", "Centrafrique", "236"],
  ["GQ", "Guinée équatoriale", "240"],
  ["ST", "Sao Tomé-et-Principe", "239"],
  ["AO", "Angola", "244"],
  ["ZA", "Afrique du Sud", "27"],
  ["KE", "Kenya", "254"],
  ["TZ", "Tanzanie", "255"],
  ["UG", "Ouganda", "256"],
  ["RW", "Rwanda", "250"],
  ["BI", "Burundi", "257"],
  ["ET", "Éthiopie", "251"],
  ["SO", "Somalie", "252"],
  ["DJ", "Djibouti", "253"],
  ["SD", "Soudan", "249"],
  ["MZ", "Mozambique", "258"],
  ["ZM", "Zambie", "260"],
  ["ZW", "Zimbabwe", "263"],
  ["MW", "Malawi", "265"],
  ["BW", "Botswana", "267"],
  ["NA", "Namibie", "264"],
  ["MG", "Madagascar", "261"],
  ["MU", "Maurice", "230"],
  ["KM", "Comores", "269"],
  ["SC", "Seychelles", "248"],
  // ── Europe ────────────────────────────────────────────────────────────────
  ["FR", "France", "33"],
  ["IT", "Italie", "39"],
  ["ES", "Espagne", "34"],
  ["PT", "Portugal", "351"],
  ["BE", "Belgique", "32"],
  ["DE", "Allemagne", "49"],
  ["NL", "Pays-Bas", "31"],
  ["GB", "Royaume-Uni", "44"],
  ["IE", "Irlande", "353"],
  ["CH", "Suisse", "41"],
  ["AT", "Autriche", "43"],
  ["LU", "Luxembourg", "352"],
  ["SE", "Suède", "46"],
  ["NO", "Norvège", "47"],
  ["DK", "Danemark", "45"],
  ["FI", "Finlande", "358"],
  ["IS", "Islande", "354"],
  ["PL", "Pologne", "48"],
  ["CZ", "Tchéquie", "420"],
  ["SK", "Slovaquie", "421"],
  ["HU", "Hongrie", "36"],
  ["RO", "Roumanie", "40"],
  ["BG", "Bulgarie", "359"],
  ["GR", "Grèce", "30"],
  ["HR", "Croatie", "385"],
  ["SI", "Slovénie", "386"],
  ["RS", "Serbie", "381"],
  ["AL", "Albanie", "355"],
  ["UA", "Ukraine", "380"],
  ["RU", "Russie", "7"],
  ["TR", "Turquie", "90"],
  ["CY", "Chypre", "357"],
  ["MT", "Malte", "356"],
  ["EE", "Estonie", "372"],
  ["LV", "Lettonie", "371"],
  ["LT", "Lituanie", "370"],
  // ── Amériques ─────────────────────────────────────────────────────────────
  ["US", "États-Unis", "1"],
  ["CA", "Canada", "1"],
  ["MX", "Mexique", "52"],
  ["BR", "Brésil", "55"],
  ["AR", "Argentine", "54"],
  ["CL", "Chili", "56"],
  ["CO", "Colombie", "57"],
  ["PE", "Pérou", "51"],
  ["VE", "Venezuela", "58"],
  // ── Moyen-Orient et Golfe ─────────────────────────────────────────────────
  ["SA", "Arabie saoudite", "966"],
  ["AE", "Émirats arabes unis", "971"],
  ["QA", "Qatar", "974"],
  ["KW", "Koweït", "965"],
  ["BH", "Bahreïn", "973"],
  ["OM", "Oman", "968"],
  ["JO", "Jordanie", "962"],
  ["LB", "Liban", "961"],
  ["IL", "Israël", "972"],
  ["IQ", "Irak", "964"],
  ["IR", "Iran", "98"],
  ["YE", "Yémen", "967"],
  // ── Asie et Océanie ───────────────────────────────────────────────────────
  ["CN", "Chine", "86"],
  ["HK", "Hong Kong", "852"],
  ["JP", "Japon", "81"],
  ["KR", "Corée du Sud", "82"],
  ["IN", "Inde", "91"],
  ["PK", "Pakistan", "92"],
  ["BD", "Bangladesh", "880"],
  ["ID", "Indonésie", "62"],
  ["MY", "Malaisie", "60"],
  ["SG", "Singapour", "65"],
  ["TH", "Thaïlande", "66"],
  ["VN", "Viêt Nam", "84"],
  ["PH", "Philippines", "63"],
  ["AU", "Australie", "61"],
  ["NZ", "Nouvelle-Zélande", "64"],
] as const;

export interface DialCountry {
  /** ISO 3166-1 alpha-2. Sert de clé de liste et de source du drapeau. */
  iso: string;
  name: string;
  /** Sans le « + » — « 221 ». */
  dial: string;
  /** Avec le « + » — « +221 ». C'est ce qui se compose dans l'identifiant. */
  prefix: string;
  flag: string;
}

/**
 * « SN » → 🇸🇳. Deux lettres majuscules converties en indicateurs régionaux
 * Unicode (U+1F1E6 pour « A »). Aucun drapeau n'est donc stocké.
 */
function flagOf(iso: string): string {
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}

export const DIAL_COUNTRIES: DialCountry[] = ENTRIES.map(([iso, name, dial]) => ({
  iso,
  name,
  dial,
  prefix: `+${dial}`,
  flag: flagOf(iso),
}));

/** Le défaut, et le seul pays dont on connaisse la longueur exacte. */
export const DEFAULT_COUNTRY: DialCountry =
  DIAL_COUNTRIES.find((country) => country.iso === "SN") ?? DIAL_COUNTRIES[0];

/**
 * Bornes E.164, indicatif compris — la règle que `normalize_phone` applique
 * côté serveur (`core/phone.py`) et que le champ web reprend déjà.
 */
const E164_MIN = 6;
const E164_MAX = 15;

/** Nombre de chiffres d'abonné acceptables pour un pays donné. */
export function subscriberBounds(country: DialCountry): { min: number; max: number } {
  return {
    min: Math.max(1, E164_MIN - country.dial.length),
    max: E164_MAX - country.dial.length,
  };
}

/**
 * ⚠ Le Sénégal est le SEUL pays dont cette table connaisse la longueur exacte :
 * neuf chiffres après l'indicatif. Pour lui, on peut dire « numéro incomplet »
 * avant d'appeler le serveur ; pour les autres, on s'en tient à la plage E.164
 * et on laisse le serveur juger. Prétendre connaître la longueur d'un numéro
 * indien ou brésilien serait inventer une règle.
 */
export const SN_SUBSCRIBER_LENGTH = 9;

export function isComplete(country: DialCountry, digits: string): boolean {
  if (country.iso === "SN") return digits.length === SN_SUBSCRIBER_LENGTH;
  const { min } = subscriberBounds(country);
  return digits.length >= min;
}

/**
 * Groupement lisible. « 2-3-2-2 » pour le Sénégal — c'est la forme sous
 * laquelle un numéro sénégalais se lit et se dicte. Ailleurs, des paires :
 * universel, et faux pour personne.
 *
 * Séparateur INSÉCABLE (`NBSP`) : un numéro ne se coupe pas en fin de ligne.
 */
export function groupDigits(country: DialCountry, digits: string): string {
  if (country.iso === "SN") {
    return [
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 7),
      digits.slice(7, 9),
    ]
      .filter(Boolean)
      .join(NBSP);
  }
  return (digits.match(/.{1,2}/g) ?? []).join(NBSP);
}

/** Recherche par nom, par code ISO ou par indicatif — « 33 », « fr », « fra ». */
export function searchCountries(query: string): DialCountry[] {
  const needle = query.trim().toLowerCase().replace(/^\+/, "");
  if (!needle) return DIAL_COUNTRIES;
  return DIAL_COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(needle) ||
      country.iso.toLowerCase().startsWith(needle) ||
      country.dial.startsWith(needle),
  );
}
