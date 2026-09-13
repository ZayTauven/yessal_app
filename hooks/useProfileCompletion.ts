/**
 * useProfileCompletion — l'état de complétude du profil, prêt à afficher.
 *
 * Le bandeau vit sur l'Accueil ET sur le Profil, deux onglets qui restent
 * montés en même temps. Deux problèmes en découlent, réglés ici par un petit
 * magasin de module plutôt que par un état local :
 *
 *   · sans partage, ouvrir l'application lancerait DEUX
 *     `GET /users/{id}/documents/` pour la même réponse ;
 *   · et un état local ne se réveillerait pas quand l'écran des documents
 *     invalide le compte après un téléversement — le bandeau resterait affiché
 *     sur un onglet déjà monté, alors même que le membre vient de faire ce
 *     qu'on lui demandait.
 *
 * `useSyncExternalStore` résout les deux : une seule source, tous les abonnés
 * prévenus. C'est aussi ce qui évite le `setState` synchrone dans un effet, que
 * le React Compiler refuse.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  🔴 LE BANDEAU NE S'AFFICHAIT PAS À LA DEUXIÈME SESSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Signalé sur la version de prévisualisation : un compte tout juste créé et
 * validé se connecte, son profil est vide à six critères sur sept, et AUCUNE
 * alerte n'apparaît sur l'Accueil.
 *
 * Le garde « une seule requête en vol » s'écrivait :
 *
 *     let enCours: Promise<void> | null = null;
 *     function charger(userId) {
 *       if (enCours) return enCours;              // ← ici
 *       enCours = AuthService.getMyDocuments(userId).then(…);
 *     }
 *
 * `enCours` n'était **jamais remis à `null` en cas de succès**, et il n'était
 * **pas rattaché à un membre**. Ce n'était donc pas un garde « en vol » mais un
 * garde « déjà fait une fois, pour n'importe qui, depuis le lancement ».
 *
 * Conséquence, vérifiée en rejouant la mécanique :
 *
 *     session 1 (id 7)   → connu = 0     appels: [7]
 *     déconnexion, puis
 *     session 2 (id 48)  → connu = null  appels: [7]   ← la requête ne part pas
 *
 * `charger(48)` rendait la promesse déjà réglée de la session 1. Le compte de
 * pièces du nouveau membre n'était jamais demandé, `connu` restait `null`, et
 * `useProfileCompletion` rend `null` — ce que le bandeau traduit, à juste
 * titre, par « je ne sais pas, je n'affiche rien ». Il suffisait d'avoir été
 * connecté une fois dans la même exécution de l'application : `hydrate()` au
 * démarrage suffit à armer le piège.
 *
 * ⚠ Second défaut, distinct, sur le même garde : en cas d'ÉCHEC, le `catch`
 * remettait `enCours` à `null` mais ne PUBLIAIT rien. Sans publication, aucun
 * abonné n'est prévenu, donc aucun rendu, donc l'effet — dont les dépendances
 * `[connu, userId]` n'ont pas bougé — ne se rejoue pas. Le commentaire disait
 * « on laisse la prochaine occasion réessayer » ; il n'y avait pas de prochaine
 * occasion. Un seul échec réseau éteignait le bandeau pour toute la session, ce
 * qui, sur la liaison Dakar ↔ VPS, arrive souvent.
 *
 * Les deux sont corrigés ici : le garde est **rattaché au membre** et **libéré
 * quand la requête se termine**, et un échec est un état explicite qui se
 * réessaie de lui-même, avec un palier croissant et un plafond.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { AuthService } from "@/lib/auth.service";
import { profileCompletion, type CompletionState } from "@/lib/profile-completion";
import { useAuthStore } from "@/store/auth.store";

/**
 * `inconnu` — jamais demandé pour ce membre : l'effet doit lancer l'appel.
 * `charge`  — `count` fait foi.
 * `echec`   — demandé, refusé. On n'affiche rien, et on ne relance PAS depuis
 *             l'effet : c'est la minuterie qui réessaie, sinon deux onglets
 *             montés produiraient une boucle de rendu et de requêtes.
 */
type Statut = "inconnu" | "charge" | "echec";

interface Snapshot {
  userId: number | null;
  /** Renseigné seulement quand `statut === "charge"`. */
  count: number | null;
  statut: Statut;
}

const VIDE: Snapshot = { userId: null, count: null, statut: "inconnu" };

/** Trois tentatives : de quoi traverser un creux de réseau, pas de quoi marteler. */
const MAX_ESSAIS = 3;

let snapshot: Snapshot = VIDE;
/** La requête en vol — ET POUR QUI. C'est ce « pour qui » qui manquait. */
let enVol: { userId: number } | null = null;
let essais = 0;
let minuterie: ReturnType<typeof setTimeout> | null = null;
const abonnes = new Set<() => void>();

function publier(next: Snapshot) {
  snapshot = next;
  for (const notifier of abonnes) notifier();
}

function subscribe(notifier: () => void) {
  abonnes.add(notifier);
  return () => {
    abonnes.delete(notifier);
  };
}

function annulerMinuterie() {
  if (minuterie) {
    clearTimeout(minuterie);
    minuterie = null;
  }
}

/** Appelée après un téléversement de pièce : le compte doit être repris. */
export function invalidateDocumentCount() {
  annulerMinuterie();
  enVol = null;
  essais = 0;
  publier({ userId: snapshot.userId, count: null, statut: "inconnu" });
}

/**
 * À la déconnexion. Le garde est désormais rattaché au membre, donc ceci n'est
 * plus ce qui empêche le défaut décrit en tête — mais deux raisons subsistent :
 * sur un téléphone partagé, le compte de pièces du membre précédent n'a rien à
 * rester en mémoire ; et un membre qui se reconnecte après qu'un administrateur
 * a validé sa pièce reverrait sinon le bandeau la réclamer encore.
 *
 * ⚠ L'abonnement va de CE MODULE VERS le store, jamais l'inverse. En sens
 * inverse — `auth.store.ts` important cette fonction — on fermerait un cycle
 * d'imports avec `useAuthStore`, que ce fichier utilise déjà.
 */
export function resetProfileCompletion() {
  annulerMinuterie();
  enVol = null;
  essais = 0;
  publier(VIDE);
}

useAuthStore.subscribe((etat, precedent) => {
  if (precedent.user && !etat.user) resetProfileCompletion();
});

function charger(userId: number) {
  /* Une seule requête en vol POUR CE MEMBRE, même si les deux onglets la
     demandent. Un membre différent doit, lui, pouvoir passer. */
  if (enVol?.userId === userId) return;
  annulerMinuterie();
  enVol = { userId };

  AuthService.getMyDocuments(userId)
    .then((documents) => {
      /* La session a pu changer pendant l'aller-retour : cette réponse ne
         concerne alors plus personne, et l'écrire écraserait le bon membre. */
      if (enVol?.userId !== userId) return;
      essais = 0;
      publier({ userId, count: documents.length, statut: "charge" });
    })
    .catch(() => {
      if (enVol?.userId !== userId) return;
      essais += 1;
      /*
        Un échec réseau ne doit PAS faire apparaître le bandeau : reprocher à un
        membre un profil incomplet parce que la 3G a lâché est le genre de faux
        reproche qui fait fermer l'application. On publie donc `echec`, que le
        crochet traduit par `null` — aucun reproche — mais qui, contrairement à
        l'ancien silence, réveille les abonnés et se réessaie.
      */
      publier({ userId, count: null, statut: "echec" });
      if (essais < MAX_ESSAIS) {
        minuterie = setTimeout(() => {
          minuterie = null;
          charger(userId);
        }, essais * 2_000);
      }
    })
    .finally(() => {
      /* ⚠ LA LIGNE QUI MANQUAIT : sans elle, le garde ne se rouvre jamais. */
      if (enVol?.userId === userId) enVol = null;
    });
}

export function useProfileCompletion(): CompletionState | null {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  const getSnapshot = useCallback(() => snapshot, []);
  const courant = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  /* Un instantané qui parle d'un AUTRE membre ne dit rien de celui-ci. */
  const pourCeMembre = courant.userId === userId;
  const statut: Statut = pourCeMembre ? courant.statut : "inconnu";
  const connu = pourCeMembre && courant.statut === "charge" ? courant.count : null;

  useEffect(() => {
    if (userId && statut === "inconnu") charger(userId);
  }, [statut, userId]);

  if (!user || connu === null) return null;
  return profileCompletion(user, connu);
}
