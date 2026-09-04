/**
 * theme/ — la source unique de vérité du langage visuel.
 *
 *   import { Violet, Ink, Type, Radius, Space } from "@/theme";
 *
 * `constants/colors.ts` reste en place le temps que les écrans migrent (phases D à F).
 * Tout composant NEUF lit ici, jamais là.
 */
export * from "./tokens";
export * from "./typography";
