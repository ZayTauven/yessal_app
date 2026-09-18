/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Identifier une personne, pas seulement la nommer
 * ═══════════════════════════════════════════════════════════════════════════
 * Jumeau de `front-web/src/lib/member-identity.ts`. Les deux doivent bouger
 * ensemble : le collecteur qui encaisse au téléphone et celui qui saisit au
 * bureau doivent voir la MÊME personne sous la même forme, sans quoi c'est à
 * la relecture des dons qu'on découvrira qu'ils ne parlaient pas du même.
 *
 * ── Le mode collecte est le plus exposé ───────────────────────────────────
 * La liste de `donate.tsx` n'affichait qu'un avatar et un nom. `DirectoryUser`
 * ne déclarait que `id`, `name` et `avatar_url` — alors que l'API rend déjà
 * `daara_name`, `phone` et `title_name`. Deux « Souleymane Sy » y étaient donc
 * DEUX LIGNES RIGOUREUSEMENT IDENTIQUES, sans le moindre moyen de choisir. Le
 * collecteur tapait au hasard, et un don mal imputé ne se voit jamais : il
 * s'affiche normalement, du côté de celui qui n'a rien donné.
 *
 * Sur les 31 membres de la base, 4 sont dans ce cas — 12 %.
 *
 * ── Ce qui se vérifie sur le terrain ──────────────────────────────────────
 * Le Daara, que le collecteur connaît puisqu'il y collecte ; et les quatre
 * derniers chiffres du téléphone, que la personne peut dire à voix haute. Tous
 * deux renseignés à 100 %. L'e-mail est unique mais invérifiable en collecte,
 * le titre n'est rempli qu'à 29 % et la photo à 6 %.
 */

export interface IdentifiableMember {
  id: number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  daara_name?: string | null;
  phone?: string | null;
}

export function memberFullName(m: IdentifiableMember): string {
  const complet = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
  return m.name?.trim() || complet || "Membre";
}

/** Casse, accents et espaces ne distinguent personne : on les retire. */
function nameKey(m: IdentifiableMember): string {
  return memberFullName(m)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Les identifiants dont le nom est porté par quelqu'un d'autre DANS CETTE
 * LISTE.
 *
 * Calculé sur ce qui est affiché, jamais sur la base entière : deux homonymes
 * dont un seul apparaît ne posent aucune question, et avertir à tort n'apprend
 * qu'une chose — à ignorer l'avertissement.
 */
export function homonymIds(members: IdentifiableMember[]): Set<number> {
  const parNom = new Map<string, number[]>();
  for (const m of members) {
    const cle = nameKey(m);
    parNom.set(cle, [...(parNom.get(cle) ?? []), m.id]);
  }
  const ids = new Set<number>();
  for (const groupe of parNom.values()) {
    if (groupe.length > 1) groupe.forEach((id) => ids.add(id));
  }
  return ids;
}

/** Les quatre derniers chiffres — ce qu'on fait confirmer à voix haute. */
export function phoneTail(phone?: string | null): string | null {
  const chiffres = String(phone ?? "").replace(/\D/g, "");
  if (chiffres.length < 4) return null;
  return `…${chiffres.slice(-4)}`;
}

/** « KANDE · …0002 ». Le Daara d'abord : c'est ce que le collecteur sait déjà. */
export function identityLine(m: IdentifiableMember): string {
  return [m.daara_name, phoneTail(m.phone)].filter(Boolean).join(" · ");
}

/**
 * La recherche du mode collecte.
 *
 * Elle ne portait que sur le nom, ce qui interdisait de lever une ambiguïté en
 * tapant le Daara — la seule chose dont le collecteur soit certain. On cherche
 * donc aussi dans le Daara et dans le numéro.
 */
export function matchesQuery(m: IdentifiableMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const foin = [
    memberFullName(m),
    m.daara_name ?? "",
    String(m.phone ?? "").replace(/\D/g, ""),
  ]
    .join(" ")
    .toLowerCase();
  return foin.includes(q);
}
