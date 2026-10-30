/**
 * lib/realtime.ts — la connexion Pusher de l'application, une seule.
 *
 * Le web écoutait les canaux de `comms/` depuis le début ; le mobile, jamais :
 * un fil ne se mettait à jour qu'au tirer-pour-rafraîchir, et la liste des
 * conversations restait figée tant qu'on n'y revenait pas. Mêmes canaux que
 * le web, mêmes événements :
 *
 *   private-user.{moi}    chat-updated · new-invitation
 *   private-chat.{fil}    new-message · message-reaction · message-deleted · chat-read
 *   presence-chat.{fil}   client-typing
 *
 * ── Pourquoi une dépendance native ──────────────────────────────────────────
 *
 * La version React Native de `pusher-js` lit l'état du réseau par
 * `@react-native-community/netinfo` pour se reconnecter d'elle-même quand le
 * téléphone repasse de la 3G au Wi-Fi. C'est précisément ce qu'il faut entre
 * Dakar et le reste du monde, où une connexion sur quatre se perd en route.
 * Elle impose un nouveau build EAS — que toute modification exige déjà, faute
 * de mises à jour à la volée dans ce projet.
 *
 * ── La clé ──────────────────────────────────────────────────────────────────
 *
 * Une clé Pusher est PUBLIQUE par construction (elle est servie au navigateur
 * par le web). Le repli est celle du web, pour qu'un build sans variable
 * d'environnement fonctionne quand même ; la signature des canaux privés,
 * elle, ne se fait que côté Django.
 */
import * as PusherModule from "pusher-js";
import type PusherClient from "pusher-js";

import { ContentService } from "@/lib/content.service";

/*
  🔴 L'APPLICATION NE DÉMARRAIT PLUS (constaté sur émulateur le 2026-10-30).

  `import Pusher from "pusher-js"` → « Object cannot be used as a constructor »
  au premier écran connecté. Les types de pusher-js 8.6 annoncent un export
  PAR DÉFAUT, mais le paquet React Native que Metro résout (champ
  `react-native` → `dist/react-native/pusher.js`) finit par
  `module.exports.Pusher = …` : un export NOMMÉ. L'import par défaut recevait
  donc l'objet `{ Pusher }`, et `new` échouait dessus. Le build web (Expo Web,
  champ `browser`) expose bien un défaut : on prend l'un ou l'autre.
*/
const Pusher: typeof PusherClient =
  (PusherModule as unknown as { Pusher?: typeof PusherClient }).Pusher ?? PusherModule.default;

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY || "bea7b0eb7536983d2be8";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "eu";

let client: PusherClient | null = null;

export function realtime(): PusherClient {
  if (client) return client;
  client = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    channelAuthorization: {
      endpoint: "",
      transport: "ajax",
      customHandler: ({ channelName, socketId }, callback) => {
        ContentService.pusherAuth(channelName, socketId)
          .then((auth) => callback(null, auth))
          .catch((error: Error) => callback(error, null));
      },
    },
  });
  return client;
}

/** À la déconnexion : le membre suivant sur ce téléphone n'écoute pas les canaux du précédent. */
export function closeRealtime() {
  client?.disconnect();
  client = null;
}

export type Handlers = Record<string, (data: never) => void>;

/**
 * S'abonne à un canal et y lie des écouteurs ; renvoie de quoi tout défaire.
 * Les écouteurs sont DÉLIÉS un par un avant le désabonnement : deux écrans
 * peuvent écouter le même canal (la liste et le fil, sur `private-user`).
 */
export function listen(channelName: string, handlers: Handlers): () => void {
  const pusher = realtime();
  const channel = pusher.channel(channelName) ?? pusher.subscribe(channelName);
  listeners.set(channelName, (listeners.get(channelName) ?? 0) + 1);
  const bound = Object.entries(handlers);
  for (const [event, fn] of bound) channel.bind(event, fn as (data: unknown) => void);
  return () => {
    for (const [event, fn] of bound) channel.unbind(event, fn as (data: unknown) => void);
    const left = (listeners.get(channelName) ?? 1) - 1;
    listeners.set(channelName, left);
    // Plus personne n'écoute — et la connexion est toujours la même : on libère le canal.
    if (left <= 0 && client === pusher) {
      listeners.delete(channelName);
      pusher.unsubscribe(channelName);
    }
  };
}

/** Combien d'écrans écoutent chaque canal. */
const listeners = new Map<string, number>();

/** Déclenche un événement client (« écrit… ») sur un canal de présence déjà ouvert. */
export function whisper(channelName: string, event: string, data: unknown) {
  const channel = client?.channel(channelName);
  if (channel?.subscribed) channel.trigger(event, data);
}

/**
 * Prévient à chaque RECONNEXION (pas à la première connexion) : pendant la
 * coupure, des événements ont pu se perdre, l'écran doit se recaler.
 */
export function onReconnect(fn: () => void): () => void {
  const pusher = realtime();
  let dejaConnecte = pusher.connection.state === "connected";
  const handler = () => {
    if (dejaConnecte) fn();
    dejaConnecte = true;
  };
  pusher.connection.bind("connected", handler);
  return () => pusher.connection.unbind("connected", handler);
}
