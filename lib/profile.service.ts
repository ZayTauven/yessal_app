/**
 * lib/profile.service.ts — ce dont le Profil et les Paramètres ont besoin.
 *
 * Pourquoi un module séparé de `content.service.ts` : celui-ci est un
 * fourre-tout de 280 lignes qui sert huit domaines. Les deux écrans de ce lot
 * n'ont besoin que de deux choses — les préférences de messagerie et le total
 * des Jëfs de l'utilisateur — et les greffer là aurait allongé le fourre-tout
 * d'un domaine de plus. Le découpage par domaine est de toute façon la
 * direction : `content.service.ts` finira par se défaire.
 */
import api from "./api";

import type {
  MessagingPreferences,
  MessagingPreferencesPatch,
} from "@/types/profile.types";

/**
 * Les préférences de messagerie. Le serveur les CRÉE à la volée
 * (`get_or_create`, `comms/views.py:350`) : un compte neuf n'a pas de ligne,
 * et l'appel n'échoue pas pour autant.
 */
export const ProfileService = {
  async getPreferences(): Promise<MessagingPreferences> {
    return api.get<MessagingPreferences>("comms/preferences/");
  },

  /**
   * Écriture partielle. Rend l'état COMPLET tel que le serveur l'a retenu —
   * on repose l'écran dessus plutôt que sur ce qu'on croyait avoir envoyé.
   *
   * ⚠ Peut lever une `ApiError` en 403 sur `visibility` seul, quand le chef du
   * Daara a verrouillé ce réglage. C'est un refus légitime, pas une panne :
   * l'appelant doit le dire à l'utilisateur et remettre l'interrupteur où il
   * était.
   */
  async updatePreferences(
    patch: MessagingPreferencesPatch,
  ): Promise<MessagingPreferences> {
    return api.patch<MessagingPreferences>("comms/preferences/", patch);
  },

  /**
   * Les deux chiffres du Profil : ce que j'ai donné cette année, et à combien
   * de Ndiguels distincts.
   *
   * **Pourquoi `?user_id=` et non un filtre côté client.** `DonationViewSet`
   * borne d'abord par le RÔLE (`contributions/views.py:51-67`) : un talibé ne
   * voit que ses dons, mais un chef de Daara voit ceux de tout son Daara et un
   * administrateur ceux du réseau. Réduire cette liste dans l'application
   * donnerait le bon chiffre — au prix du transfert de tous les dons du réseau
   * pour en afficher deux nombres. Le paramètre est appliqué APRÈS la portée du
   * rôle (le commentaire de `get_queryset` insiste là-dessus) : il ne peut donc
   * pas élargir ce qu'on a le droit de voir.
   *
   * Ne compte QUE les dons `confirmed`. Un Jëf initié sur Wave et jamais validé
   * n'a pas quitté la poche de son auteur ; l'afficher dans un total en
   * ferait une promesse.
   */
  async getJefSummary(userId: number, year: number): Promise<JefSummary> {
    const raw = await api.get<Paginated<RawDonation>>(
      `contributions/?user_id=${userId}`,
    );
    const rows = Array.isArray(raw) ? raw : (raw.results ?? []);

    let total = 0;
    const campaigns = new Set<number>();
    for (const row of rows) {
      if (row.payment_status !== "confirmed") continue;
      if (new Date(row.created_at).getFullYear() !== year) continue;
      total += Number(row.amount) || 0;
      if (typeof row.campaign === "number") campaigns.add(row.campaign);
    }
    return { total, campaignCount: campaigns.size };
  },
};

export interface JefSummary {
  /** Somme des Jëfs confirmés de l'année, en FCFA. */
  total: number;
  /** Nombre de Ndiguels DISTINCTS soutenus dans l'année. */
  campaignCount: number;
}

type Paginated<T> = { results?: T[] } | T[];

/**
 * Les quatre seuls champs dont le résumé a besoin — vérifiés dans
 * `contributions/serializers.py`. On ne réemploie pas `normalizeDonation` de
 * `content.service.ts` : il est privé à ce module, et l'exporter pour deux
 * additions ferait dépendre ce service du fourre-tout qu'on cherche à défaire.
 */
interface RawDonation {
  amount: string | number;
  campaign: number | null;
  payment_status: string;
  created_at: string;
}

export default ProfileService;
