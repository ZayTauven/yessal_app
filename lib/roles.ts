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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Les libellés des rôles — repris du web, qui les avait déjà unifiés
 * ═══════════════════════════════════════════════════════════════════════════
 * `front-web/src/lib/roles.ts` porte cette table depuis qu'elle avait divergé
 * dans huit fichiers. Côté mobile elle est encore recopiée dans `profile.tsx`
 * et `daara.tsx` — deux `ROLE_LABELS` locaux. On pose la source ici pour les
 * écrans neufs ; les deux anciennes tables les rejoindront, mais pas dans ce
 * lot : `daara.tsx` mêle rôle et TITRE dans le même emplacement (« Amir » sur
 * une ligne d'annuaire, « Chef du Daara » sur la carte juste au-dessus), et
 * c'est une question d'affichage à trancher, pas un doublon à supprimer.
 *
 * Les clés suivent `User.Role` côté Django (`accounts/models.py`), et les
 * libellés sont ceux du web au mot près : un membre qui passe du tableau de
 * bord au téléphone doit lire la même chose sur la même personne.
 */
export const ROLE_LABEL: Record<string, string> = {
  member: "Talibé",
  collector: "Collecteur",
  chef_daara: "Chef de Daara",
  tutelle: "Tutelle",
  admin: "Administrateur",
};

const ROLE_LABEL_LONG: Record<string, string> = {
  ...ROLE_LABEL,
  collector: "Talibé · Collecteur",
};

/**
 * Forme courte. Renvoie la clé telle quelle si le rôle est inconnu — mieux
 * vaut afficher `superviseur` que rien du tout le jour où Django en ajoute un.
 */
export function roleLabel(role?: string | null): string {
  if (!role) return "—";
  return ROLE_LABEL[role] ?? role;
}

/**
 * Forme qui rappelle le rattachement, là où l'on désigne une PERSONNE dans sa
 * communauté. Un collecteur reste un talibé ; le taire donnerait à croire
 * qu'il s'agit d'un autre statut.
 */
export function roleLabelLong(role?: string | null): string {
  if (!role) return "—";
  return ROLE_LABEL_LONG[role] ?? role;
}

/**
 * Le titre de la liste des Jëfs — il dépend du rôle parce que LA DONNÉE en
 * dépend, pas par coquetterie.
 *
 * ⚠ `DonationViewSet.get_queryset` (`contributions/views.py:70`) sert des
 * ensembles DIFFÉRENTS : un admin voit tout, un chef de Daara les dons de son
 * Daara, un talibé les siens — et un **collecteur voit ce qu'il a ENCAISSÉ**
 * (`filter(collector=user)`), pas ce qu'il a donné. Intituler cet écran « Mes
 * Jëfs » pour un collecteur, c'est lui présenter les dons des autres comme les
 * siens.
 *
 * ⚠ Conséquence à porter au registre, non corrigée ici parce qu'elle est côté
 * Django : **un collecteur ne peut voir ses propres Jëfs nulle part.** Le
 * tableau de bord a exactement le même défaut, et il l'intitule « Mes Jëfs »
 * (`front-web/src/lib/nav.ts`, `donationsTitle`) — c'est le web à aligner.
 */
export function donationsTitle(role?: string | null): string {
  if (role === "admin") return "Les Jëfs";
  if (role === "chef_daara") return "Jëfs du Daara";
  if (role === "collector") return "Jëfs collectés";
  return "Mes Jëfs";
}
