/**
 * lib/profile-completion.ts — la règle du profil complet.
 *
 * **Règle de produit Yessal**, déjà tenue par `front-web` : un membre doit
 * renseigner son état civil, sa photographie, son adresse et une pièce
 * d'identité. Tant que ce n'est pas fait, une alerte persistante le lui
 * rappelle.
 *
 * ── Pourquoi le mobile ne l'avait plus ─────────────────────────────────────
 *
 * La phase E a retiré le bandeau « Profil incomplet », au motif qu'« il
 * réclamait des champs que plus aucun écran ne demande ». C'était exact — et
 * c'était le mauvais bout : le même lot venait de supprimer le formulaire
 * d'état civil sans lui donner de nouveau domicile. On a donc retiré le
 * rappel plutôt que de rétablir la destination. Les deux reviennent ensemble :
 * `app/(app)/profile/informations.tsx` porte le formulaire, ce module porte la
 * règle.
 *
 * ── ⚠ Le web se contredit lui-même, et ce module tranche ───────────────────
 *
 * `ProfileCompletionBanner.tsx` déclare complet un profil qui a
 * `birth_date`, `gender`, `residence_country` et une pièce — **quatre
 * critères**. Mais `ProfileClient.tsx` affiche, sur la même donnée, une liste
 * de contrôle de **sept** : il y ajoute le prénom et le nom, la photographie
 * et l'adresse complète.
 *
 * Un membre pouvait donc voir « profil complet » d'un côté et « 5 sur 7 » de
 * l'autre. Ce module retient **les sept**, qui sont l'énoncé de la règle telle
 * que le commanditaire la formule.
 *
 * Conséquence à connaître : un membre sans photographie ni adresse ne voit plus
 * de bandeau sur le web, mais en voit un ici. **C'est le web qu'il faut
 * aligner**, pas ce module qu'il faut relâcher — porté au registre.
 */
import type { User } from "@/types";

export interface CompletionItem {
  /** Clé stable — sert de `key` de liste et de repère de test. */
  id: string;
  label: string;
  done: boolean;
  /** L'écran qui permet de le renseigner. */
  route: "/profile/informations" | "/profile/documents" | "/profile/settings";
}

export interface CompletionState {
  items: CompletionItem[];
  missing: CompletionItem[];
  /** 0 à 1. */
  ratio: number;
  complete: boolean;
}

function filled(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

/**
 * L'état de complétude d'un profil.
 *
 * `documentCount` vient d'un appel séparé : `UserSerializer` ne sert pas les
 * pièces d'identité, elles vivent sur `GET /users/{id}/documents/`. Le web fait
 * la même jointure côté serveur avant de rendre son bandeau.
 */
export function profileCompletion(
  user: User | null,
  documentCount: number,
): CompletionState {
  const items: CompletionItem[] = [
    {
      id: "identity",
      label: "Prénom et nom",
      done: filled(user?.first_name) && filled(user?.last_name),
      route: "/profile/informations",
    },
    {
      id: "birth_date",
      label: "Date de naissance",
      done: filled(user?.birth_date),
      route: "/profile/informations",
    },
    {
      id: "gender",
      label: "Genre",
      done: filled(user?.gender),
      route: "/profile/informations",
    },
    {
      id: "avatar",
      label: "Photo de profil",
      /* Deux champs pour une seule chose : `avatar` est le fichier téléversé,
         `avatar_url` une adresse extérieure. L'un ou l'autre suffit. */
      done: filled(user?.avatar) || filled(user?.avatar_url),
      route: "/profile/settings",
    },
    {
      id: "residence_country",
      label: "Pays de résidence",
      done: filled(user?.residence_country),
      route: "/profile/informations",
    },
    {
      id: "address",
      label: "Adresse complète",
      done: filled(user?.address) && filled(user?.city),
      route: "/profile/informations",
    },
    {
      id: "document",
      label: "Pièce d'identité",
      done: documentCount > 0,
      route: "/profile/documents",
    },
  ];

  const missing = items.filter((item) => !item.done);
  return {
    items,
    missing,
    ratio: (items.length - missing.length) / items.length,
    complete: missing.length === 0,
  };
}

/**
 * Le résumé d'une ligne : « Il vous reste la date de naissance et la photo. »
 *
 * Nommer ce qui manque plutôt que compter : « 2 informations manquantes » fait
 * ouvrir l'écran pour découvrir lesquelles.
 */
export function missingSummary(missing: CompletionItem[]): string {
  const noms = missing.map((item) => item.label.toLowerCase());
  if (noms.length === 0) return "";
  if (noms.length === 1) return noms[0];
  if (noms.length === 2) return `${noms[0]} et ${noms[1]}`;
  return `${noms.slice(0, 2).join(", ")} et ${noms.length - 2} autre${
    noms.length - 2 > 1 ? "s" : ""
  }`;
}
