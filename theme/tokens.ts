/**
 * theme/tokens.ts — source unique de vérité du langage visuel Yessal Gui.
 *
 * Transcription littérale de la planche « Tokens Yessal Gui »
 * (AGENTS/Design-Analyse-UX/Refonte mobile Yessal Gui/Tokens Yessal Gui.dc.html).
 * Les noms sont contractuels : ils sont ceux de la maquette. Ne pas les renommer
 * sans corriger la planche — c'est ce qui permet de relire une maquette et de
 * savoir quelle valeur employer.
 *
 * Les ratios en commentaire sont calculés sur fond blanc et vérifiés.
 */
import type { TextStyle } from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Couleurs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La rampe violette — teinte 257°, identique à l'accent de l'application web.
 *
 * Structure transposée de Fundio : une teinte poussée à deux extrêmes de
 * luminosité. Le cran sombre porte tout le texte, le cran clair porte tous
 * les fonds d'action.
 */
export const Violet = {
  /** Surfaces sombres, logo, splash — 18,2:1 */
  950: "#190B3D",
  /** Titres, texte sur violet-300 et sur les pastels, trait des illustrations — 14,5:1 */
  900: "#2F1966",
  /** Icônes actives, texte violet secondaire — 9,5:1 */
  700: "#4E2E9E",
  /** Liens, remplissage des barres de progression — 5,2:1 */
  500: "#7954D4",
  /**
   * Couleur de marque, identique au web. Accents décoratifs uniquement.
   * ⚠ Jamais de texte petit dessus : un label n'y tient que 3,85:1.
   */
  400: "#916EE7",
  /**
   * FOND DES ACTIONS — bouton principal, capsule d'onglet actif.
   * Le label posé dessus est Violet[900] : 6,20:1, AA.
   */
  300: "#B79BF3",
  /** Fonds de section, état sélectionné — 1,5:1 */
  200: "#D7CBF6",
  /** Fond de champ de saisie, piste de progression — 1,2:1 */
  100: "#EEE9FC",
} as const;

/** Les neutres — le texte quand il n'est pas violet. */
export const Ink = {
  /** Texte principal */
  900: "#1C1C1A",
  /** Texte secondaire, labels */
  500: "#6B6B65",
  /** Texte tertiaire, icônes d'onglet inactives — le « Gunsmoke » de Fundio */
  300: "#868686",
  /** Barres inactives, séparateurs */
  100: "#D9D9D9",
} as const;

export const Surface = {
  /** Fond général */
  default: "#FFFFFF",
  /** Fond de section */
  alt: "#F7F7F5",
  /** Bouton secondaire — repris tel quel de Fundio */
  btn: "#EDF0ED",
} as const;

/**
 * L'exception verte, et il n'y en a qu'une.
 *
 * Le CHIFFRE FCFA lui-même est vert. Rien d'autre : ni les boutons, ni les
 * icônes, ni les barres de progression, ni les libellés qui l'entourent.
 * C'est une couleur sémantique, au même titre que l'erreur — et c'est déjà la
 * règle de l'application web (`--yessal-montant`).
 *
 * Sur une photographie, le montant reste BLANC. Le vert ne s'applique que sur
 * fond clair.
 *
 * 7,97:1 — AA
 */
export const montant = "#1A5C3A";

/**
 * Sémantiques.
 *
 * Le succès bascule sur le violet : le #2D6A4F historique se confondait avec
 * `montant` à petite taille, et le vert doit ne signifier qu'une chose.
 * L'avertissement et l'erreur sont remontés en luminance pour passer AA.
 */
export const Status = {
  /** 9,5:1 — c'est Violet[700], délibérément */
  success: "#4E2E9E",
  /** 5,6:1 */
  warning: "#8F5F0A",
  /** 7,0:1 */
  error: "#A62B2B",
  /** 8,6:1 */
  info: "#1C4E7A",
} as const;

/**
 * Pastels des tuiles, repris verbatim de Fundio.
 * Le trait des pictogrammes posés dessus est Violet[900], jamais noir —
 * c'est ce qui rattache les tuiles à la marque.
 */
export const Pastel = {
  /** Ndiguels — Violet[900] dessus : 9,10:1 */
  peach: "#FFC192",
  /** Actualités — 11,80:1 */
  yellow: "#FFEA6B",
  /** Mon Daara — 9,85:1 */
  teal: "#A1E1E2",
  /** réserve */
  pink: "#FFD7ED",
  /** réserve */
  lilac: "#D9CFF5",
} as const;

export const Border = {
  /** 1 px. Presque invisible : c'est voulu. */
  hairline: "rgba(28,28,26,0.08)",
  /** Le seul cran plus marqué, pour les boutons `outline`. */
  strong: "rgba(28,28,26,0.16)",
} as const;

/**
 * Voile vertical sous les photographies — le seul dégradé du produit.
 * Aucun dégradé de marque, aucun dégradé violet, aucun radial.
 * À passer à `expo-linear-gradient` : colors={ScrimPhoto.colors} locations={ScrimPhoto.locations}
 */
export const ScrimPhoto = {
  colors: ["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"] as const,
  locations: [0.4, 1] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Typographie — Plus Jakarta Sans, embarquée. Pas de graisse variable.
// ─────────────────────────────────────────────────────────────────────────────

export const Font = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

/**
 * Chiffres à chasse fixe.
 *
 * ⚠ Le tableau est typé sur `TextStyle["fontVariant"]` et NON figé par
 * `as const`. Le `as const` de `Type` rendrait le tableau `readonly`, et
 * React Native attend un `FontVariant[]` mutable : tout `StyleSheet.create`
 * qui étale un cran de montant verrait l'inférence de l'objet ENTIER retomber
 * sur l'union `ViewStyle | TextStyle | ImageStyle`, et des dizaines d'erreurs
 * sans rapport apparaîtraient ailleurs dans le fichier.
 */
const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

/**
 * L'échelle. Chaque cran porte sa taille, son interligne calculé, sa graisse.
 *
 * ⚠ Plancher d'interligne : 1,15 × la taille. En dessous, le tréma de « Jëf »
 * se fait rogner. `includeFontPadding` doit rester actif sur Android.
 *
 * ⚠ Tout montant porte `fontVariant: ["tabular-nums"]`, sinon les chiffres
 * dansent dans les listes et pendant les animations de compteur.
 */
export const Type = {
  screenTitle: {
    fontFamily: Font.extrabold,
    fontSize: 32,
    lineHeight: 37, // 1,15
    letterSpacing: -0.64, // −0,02em
  },
  greeting: {
    fontFamily: Font.bold,
    fontSize: 24,
    lineHeight: 30, // 1,25
    letterSpacing: -0.24, // −0,01em
  },
  amountHero: {
    fontFamily: Font.bold,
    fontSize: 44,
    lineHeight: 50, // 1,05 arrondi au-dessus du plancher
    letterSpacing: -1.1,
    fontVariant: TABULAR,
  },
  amountCard: {
    fontFamily: Font.bold,
    fontSize: 20,
    lineHeight: 24, // 1,2
    fontVariant: TABULAR,
  },
  cardTitle: {
    fontFamily: Font.bold,
    fontSize: 17,
    lineHeight: 22, // 1,3
    letterSpacing: -0.17,
  },
  body: {
    fontFamily: Font.regular,
    fontSize: 14,
    lineHeight: 21, // 1,5
  },
  label: {
    fontFamily: Font.medium,
    fontSize: 12,
    lineHeight: 16, // 1,35
  },
  micro: {
    fontFamily: Font.medium,
    fontSize: 11,
    lineHeight: 14, // 1,3
    letterSpacing: 0.11, // +0,01em
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Formes, espace, matière
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rayons. Tout rayon non-capsule s'accompagne de `borderCurve: "continuous"` —
 * c'est ce qui donne le squircle plutôt qu'un arrondi circulaire.
 * Voir `continuous` ci-dessous.
 */
export const Radius = {
  card: 20,
  tile: 20,
  input: 14,
  /** capsule */
  chip: 999,
  /** capsule */
  button: 999,
  /** capsule */
  avatar: 999,
} as const;

/** À étaler sur tout conteneur au rayon non-capsule. */
export const continuous = { borderCurve: "continuous" } as const;

/**
 * Transparence au toucher — en STYLE, pas en prop.
 *
 * `<View pointerEvents="none">` est déprécié depuis React Native 0.71 et
 * l'avertissement remonte à chaque rendu sur Expo Web :
 * « props.pointerEvents is deprecated. Use style.pointerEvents ». La valeur
 * a simplement déménagé dans le style ; on la nomme ici pour ne pas la
 * réécrire à neuf endroits.
 *
 *   `noTouch`     la vue ET ses enfants ignorent le toucher — voiles,
 *                 dégradés, pastilles décoratives posées sur une photo.
 *   `passThrough` la vue laisse passer, ses enfants pressables captent. Ce
 *                 qu'il faut au-dessus d'une couche cliquable : le texte ne
 *                 vole pas la touche, le bouton la prend.
 */
export const noTouch = { pointerEvents: "none" } as const;
export const passThrough = { pointerEvents: "box-none" } as const;

/** Échelle de 4. */
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

/** La gouttière d'écran — la seule valeur qui ne se négocie pas. */
export const GUTTER = 20;

/** Zone tactile minimale. */
export const HIT = 44;

/**
 * Élévation — deux exceptions, une seule couche chacune.
 * Tout le reste se sépare par le fond et l'espace.
 * `boxShadow` (RN 0.76+), jamais les styles `shadow*` / `elevation` hérités.
 */
export const Shadow = {
  /** Le seul flou autorisé du produit. */
  tabbar: "0 10px 28px rgba(14, 24, 16, 0.10)",
  /** Feuilles modales. Elles sont opaques : rien d'autre ne floute. */
  sheet: "0 -8px 32px rgba(14, 24, 16, 0.12)",
} as const;

export const Tokens = {
  Violet,
  Ink,
  Surface,
  montant,
  Status,
  Pastel,
  Border,
  ScrimPhoto,
  Font,
  Type,
  Radius,
  continuous,
  Space,
  GUTTER,
  HIT,
  Shadow,
} as const;

export default Tokens;
