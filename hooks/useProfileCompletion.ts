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
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { AuthService } from "@/lib/auth.service";
import { profileCompletion, type CompletionState } from "@/lib/profile-completion";
import { useAuthStore } from "@/store/auth.store";

interface Snapshot {
  userId: number | null;
  /** `null` : pas encore su. On ne conclut rien tant que c'est le cas. */
  count: number | null;
}

let snapshot: Snapshot = { userId: null, count: null };
let enCours: Promise<void> | null = null;
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

/** Appelée après un téléversement de pièce : le compte doit être repris. */
export function invalidateDocumentCount() {
  enCours = null;
  publier({ userId: snapshot.userId, count: null });
}

function charger(userId: number) {
  /* Une seule requête en vol, même si les deux onglets la demandent. */
  if (enCours) return enCours;
  enCours = AuthService.getMyDocuments(userId)
    .then((documents) => {
      publier({ userId, count: documents.length });
    })
    .catch(() => {
      /**
       * Un échec réseau ne doit PAS faire apparaître le bandeau : reprocher à
       * un membre un profil incomplet parce que la 3G a lâché est le genre de
       * faux reproche qui fait fermer l'application. On ne conclut rien, et on
       * laisse la prochaine occasion réessayer.
       */
      enCours = null;
    });
  return enCours;
}

export function useProfileCompletion(): CompletionState | null {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  const getSnapshot = useCallback(() => snapshot, []);
  const courant = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const connu = courant.userId === userId ? courant.count : null;

  useEffect(() => {
    if (userId && connu === null) charger(userId);
  }, [connu, userId]);

  if (!user || connu === null) return null;
  return profileCompletion(user, connu);
}
