/**
 * theme/typography.ts — les crans de texte propres aux composants.
 *
 * `tokens.ts` transcrit la planche « Tokens ». Mais la planche « Composants »
 * spécifie des crans qui n'y figurent pas : le label de bouton en 15/700, la
 * pilule en 13/700, le chiffre du pavé en 24/600. Ils sont réunis ici plutôt
 * que dispersés en nombres magiques dans dix-sept fichiers.
 *
 * Source : « Composants Yessal Gui.dc.html ». Même règle qu'ailleurs — un cran
 * qui change ici doit changer sur la planche, et réciproquement.
 *
 * ⚠ Interligne : plancher à 1,15 × la taille (le tréma de « Jëf »).
 */
import type { TextStyle } from "react-native";
import { Font } from "./tokens";

/** Même précaution que dans `tokens.ts` : mutable, sinon l'inférence casse. */
const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

export const UIType = {
  /** Bouton pleine hauteur — h52 */
  buttonLabel: { fontFamily: Font.bold, fontSize: 15, lineHeight: 18 },
  /** Bouton compact — h44, celui de la Card d'accueil */
  buttonLabelSm: { fontFamily: Font.bold, fontSize: 14, lineHeight: 17 },
  /** Chip de filtre, label de QuickActionTile, onglet actif */
  chipLabel: { fontFamily: Font.bold, fontSize: 13, lineHeight: 16 },
  /** Badge, compteur de chip, pastille « +38 » de la pile d'avatars */
  badgeLabel: { fontFamily: Font.bold, fontSize: 11, lineHeight: 14 },
  /** Titre de PaymentMethodRow, de ScreenHeader compact, d'ErrorState */
  rowTitle: { fontFamily: Font.bold, fontSize: 15, lineHeight: 19 },
  /** Nom d'une personne — TutelleCard */
  personName: { fontFamily: Font.bold, fontSize: 14, lineHeight: 18 },
  /** Texte saisi dans un champ */
  fieldText: { fontFamily: Font.medium, fontSize: 15, lineHeight: 19 },
  /** Indicatif figé d'un champ — « +221 » */
  fieldPrefix: { fontFamily: Font.bold, fontSize: 15, lineHeight: 19 },
  /** Chiffre du pavé numérique — touches 72 px */
  keypadDigit: { fontFamily: Font.semibold, fontSize: 24, lineHeight: 28 },
  /** Montant rapide de l'AmountSelector */
  quickAmount: {
    fontFamily: Font.bold,
    fontSize: 14,
    lineHeight: 17,
    fontVariant: TABULAR,
  },
  /** Corps d'un état vide ou d'erreur — plus aéré que `Type.body` */
  stateBody: { fontFamily: Font.regular, fontSize: 13, lineHeight: 20 },
  /** Initiales d'un avatar 44 — 0,36 × la taille */
  avatarInitials: { fontFamily: Font.bold, fontSize: 16, lineHeight: 20 },
} as const;

export default UIType;
