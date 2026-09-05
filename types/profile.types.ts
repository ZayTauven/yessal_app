/**
 * types/profile.types.ts — les préférences de messagerie, telles que le
 * serveur les connaît.
 *
 * ⚠ Écrit EN REGARDANT le serializer, pas de mémoire. Ce dépôt s'est fait
 * prendre trois fois par un type qui déclarait ce que l'API n'envoie pas — les
 * Ndiguels, la messagerie, les tutelles. Un type faux ne produit aucune erreur
 * de compilation, seulement un `undefined` silencieux et un écran qui a l'air
 * de marcher.
 *
 * Source : `yessal-backend/comms/serializers.py:279-289`
 * (`UserMessagingPreferencesSerializer.Meta.fields`), modèle
 * `comms/models.py:200-220`. Les six champs ci-dessous sont **exactement** ceux
 * de `Meta.fields`, ni plus ni moins.
 */

/** `UserMessagingPreferences.Visibility` — `comms/models.py:201-204`. */
export type MessagingVisibility = "all" | "daara_only" | "nobody";

export interface MessagingPreferences {
  /** Qui peut me trouver dans la recherche de membres. */
  visibility: MessagingVisibility;
  /** J'accepte qu'on m'ouvre une conversation en tête-à-tête. */
  allow_direct_invites: boolean;
  /** J'accepte qu'on m'ajoute à un groupe. */
  allow_group_invites: boolean;
  /** Les autres voient que je suis en ligne. */
  show_online_status: boolean;
  /** Je reçois les notifications de messages. */
  notifications_enabled: boolean;
  /** …mais seulement quand on me cite nommément. */
  notify_on_mention_only: boolean;
}

/**
 * Le `PATCH` est partiel — c'est ce que fait `UserPreferencesView.patch`
 * (`comms/views.py:353-364`), qui instancie le serializer avec `partial=True`.
 *
 * ⚠ `visibility` peut être **refusé en 403** : quand la configuration de
 * pilotage du Daara pose `allow_member_visibility_setting = False`, le serveur
 * répond `PermissionDenied` (`comms/views.py:358-359`). L'écran doit traiter ce
 * refus, pas le supposer impossible.
 */
export type MessagingPreferencesPatch = Partial<MessagingPreferences>;
