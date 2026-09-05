/**
 * lib/roles.ts — qui a le droit de voir quoi.
 *
 * La règle des montants était recopiée dans chaque écran qui l'applique :
 * `const AMOUNT_ROLES = ["admin", "chef_daara", "collector"]`, dans `home` puis
 * dans `campaigns`. Deux copies, c'est un doublon ; quatre, c'est une règle
 * métier qui n'a plus de source. Le détail d'un Ndiguel et la feuille Jëf en
 * ajoutaient deux.
 *
 * ⚠ CE N'EST PAS UNE FRONTIÈRE DE SÉCURITÉ. C'est une règle d'AFFICHAGE.
 * `GET /events/campaigns/{id}/etat/` est ouvert à tout utilisateur authentifié
 * — `IsCampaignOrganizer.has_object_permission` laisse passer toutes les
 * méthodes sûres (`events/views.py:37-41`) — et il renvoie la somme collectée
 * ET la liste nominative des contributeurs avec leurs montants. Un talibé qui
 * appelle l'API directement voit donc ce que cet écran lui cache.
 * Porté au registre de dette ; la correction est côté Django.
 */
import type { UserRole } from "@/types/auth.types";

/**
 * Les rôles qui voient les sommes collectées.
 *
 * Le talibé en est exclu : la planche remplace, pour lui, le montant par les
 * visages et le nombre de participants. La carte ne rétrécit pas — elle dit
 * autre chose.
 */
const AMOUNT_ROLES: readonly string[] = ["admin", "chef_daara", "collector"];

/** Vrai si ce rôle a le droit de voir la somme collectée d'un Ndiguel. */
export function canSeeAmounts(role: UserRole | string | null | undefined): boolean {
  return AMOUNT_ROLES.includes(role ?? "");
}

/**
 * Les rôles qui peuvent enregistrer un Jëf POUR QUELQU'UN D'AUTRE, en espèces.
 *
 * ⚠ La nuance qui compte, et que la planche énonce : on ne masque pas à
 * quelqu'un ce qu'il vient de donner. Le montant de SON PROPRE Jëf reste vert
 * et visible pour tout le monde, `canSeeAmounts` ou non.
 */
const COLLECT_ROLES: readonly string[] = ["admin", "chef_daara", "collector"];

/** Vrai si ce rôle peut saisir une collecte au nom d'un membre. */
export function canCollect(role: UserRole | string | null | undefined): boolean {
  return COLLECT_ROLES.includes(role ?? "");
}
