import { create } from "zustand";
import { ApiError } from "@/lib/api";
import { AuthService } from "@/lib/auth.service";
import { PushService } from "@/lib/push.service";
import type {
  ForgotPasswordPayload,
  LoginPayload,
  ProfileUpdatePayload,
  RegisterPayload,
  User,
} from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>;
  /**
   * Repose l'utilisateur du store sur ce que le serveur vient de renvoyer.
   *
   * Pour les écritures que `updateProfile` ne sait pas faire — le portrait, qui
   * part en `FormData` et non en JSON (`AuthService.updateAvatar`). L'ancien
   * écran de profil appelait `useAuthStore.setState({ user })` depuis le corps
   * du composant : ça marche, mais ça contourne le contrat du store, et rien
   * n'aurait signalé le jour où le contrat aurait changé.
   */
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

/**
 * Le message du serveur, ou le repli.
 *
 * ⚠ CE STORE LISAIT `e.response.data` — LA FORME D'AXIOS. `lib/api.ts` est bâti
 * sur `fetch` et lève un `ApiError` qui porte sa charge dans `.payload` : la
 * lecture ne trouvait donc **jamais rien**, et les huit sites qui l'employaient
 * retombaient tous sur leur phrase générique.
 *
 * Concrètement, une inscription refusée parce que l'adresse est déjà prise
 * affichait « Impossible de créer le compte pour le moment » — un message qui
 * fait recommencer à l'identique — au lieu de « Un compte avec cette adresse
 * existe déjà », qui dit quoi faire.
 *
 * `ApiError.message` est déjà extrait par `extractErrorMessage`, mais celui-ci
 * ne descend que dans `detail`, `message`, `non_field_errors` et `error`. Les
 * erreurs de validation de DRF arrivent **par champ** — `{"email": ["…"]}` —
 * et c'est exactement la forme d'un formulaire d'inscription refusé. D'où la
 * seconde passe ci-dessous.
 */
/** Ce qu'un nettoyage de déconnexion a le droit d'attendre au plus. */
const DELAI_NETTOYAGE_MS = 4000;

/** La promesse, ou rien passé le délai — jamais une attente sans fin. */
function avantDelai<T>(promesse: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promesse,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

function messageServeur(erreur: unknown, repli: string, champs: string[] = []): string {
  if (!(erreur instanceof ApiError)) return repli;

  const payload = erreur.payload as Record<string, unknown> | undefined;
  if (payload && typeof payload === "object") {
    for (const champ of champs) {
      const valeur = payload[champ];
      if (typeof valeur === "string" && valeur.trim()) return valeur;
      if (Array.isArray(valeur) && typeof valeur[0] === "string") return valeur[0];
    }
  }

  /* `message` porte déjà `detail` / `non_field_errors` quand ils existent ;
     « HTTP 400 » signifie qu'il n'a rien trouvé, et ne se montre pas. */
  if (erreur.message && !/^HTTP\s\d+$/.test(erreur.message)) return erreur.message;
  return repli;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const { access } = await AuthService.getStoredTokens();
      if (access) {
        const user = await AuthService.getMe();
        set({ user, isAuthenticated: true });
        /*
          Le jeton FCM se renouvelle tout seul — réinstallation, restauration
          d'une sauvegarde, vidage des données. On le repose donc à chaque
          session retrouvée, pas seulement à la connexion. `update_or_create`
          côté Django rend l'opération idempotente.

          Volontairement SANS `await` : la poussée est un confort, l'écran
          d'accueil ne doit pas attendre une permission système pour s'afficher.
        */
        void PushService.register();
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch {
      await AuthService.logout();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.login(payload);
      const user = await AuthService.getMe();
      set({ user, isAuthenticated: true });
      void PushService.register();
    } catch (e: any) {
      const msg = messageServeur(e, "Identifiants incorrects. Veuillez réessayer.");
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.register(payload);
    } catch (e: any) {
      const msg = messageServeur(e, "Impossible de créer le compte pour le moment.", [
        "email",
        "phone",
        "password",
        "daara_id",
        "first_name",
        "last_name",
      ]);
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  forgotPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.forgotPassword(payload);
    } catch (e: any) {
      const msg = messageServeur(e, "Impossible d'envoyer le lien de récupération.", [
        "email",
      ]);
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (payload) => {
    set({ error: null });
    try {
      const user = await AuthService.updateMe(payload);
      set({ user });
    } catch (e: any) {
      const msg = messageServeur(e, "Impossible de mettre à jour le profil.", [
        "first_name",
        "last_name",
        "phone",
      ]);
      set({ error: msg });
      throw e;
    }
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    /*
      🔴 DÉCONNEXION BLOQUÉE SUR UN ÉCRAN GRIS (retour terrain du 2026-10-30).

      Elle posait `isLoading: true` d'entrée — et `(app)/_layout` ne rend RIEN
      tant que `isLoading` est vrai — puis attendait le retrait du jeton FCM :
      une requête réseau SANS délai. Sur la liaison Dakar ↔ VPS, où une
      connexion sur quatre se perd, elle pouvait ne jamais revenir : écran
      vide pour toujours, et comme la suite ne s'exécutait pas, les jetons
      restaient en place — la session se rouvrait au lancement suivant.

      Désormais : pas d'`isLoading` (l'écran reste celui qu'on quitte), chaque
      nettoyage est borné dans le temps, et la session tombe QUOI QU'IL ARRIVE.
    */
    try {
      /*
        ⚠ LE RETRAIT PASSE EN PREMIER : `comms/fcm-token/` exige une session,
        et `AuthService.logout()` efface les jetons d'accès. Retirer après,
        c'est un 401 — le jeton FCM resterait en base, et le membre suivant sur
        cet appareil recevrait les notifications du précédent. Borné : passé le
        délai, le serveur purgera de lui-même ce jeton quand FCM le déclarera mort.
      */
      await avantDelai(PushService.unregister(), DELAI_NETTOYAGE_MS);
      /* Les canaux Pusher de ce membre se ferment avec sa session. Import
         différé : `lib/realtime` tire `content.service` puis `api`, et un import
         de haut niveau bouclerait sur ce store. */
      await avantDelai(
        import("@/lib/realtime").then((m) => m.closeRealtime()),
        DELAI_NETTOYAGE_MS,
      );
    } catch {
      /* Un nettoyage raté n'empêche jamais de sortir. */
    } finally {
      await AuthService.logout().catch(() => undefined);
      /*
        Le compte de pièces d'identité vit dans un magasin de module
        (`hooks/useProfileCompletion.ts`) et ne disparaît donc pas avec `user`. Il
        s'efface de lui-même : ce module s'abonne À CE STORE et se remet à zéro
        quand la session tombe. L'abonnement va dans ce sens-là, et pas l'inverse,
        pour ne pas créer de cycle d'imports entre `store/` et `hooks/`.
      */
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
