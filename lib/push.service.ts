/**
 * lib/push.service.ts — les notifications poussées.
 *
 * `expo-notifications` était une dépendance INSTALLÉE ET JAMAIS IMPORTÉE :
 * l'audit de parité l'a relevée, et `comms/fcm-token/` n'était appelé par
 * aucun chemin. Le membre ne recevait donc rien tant qu'il n'ouvrait pas
 * l'application — pour un produit de Daara où l'on annonce un Ndiguel, une
 * fête ou un message du chef, c'était un site web plus lent à ouvrir.
 *
 * ── Ce que le serveur attend, et pourquoi ça dicte tout ─────────────────────
 *
 * Django envoie par **firebase-admin**, en `MulticastMessage(tokens=[…])`
 * (`comms/services.py:64`). Ces jetons doivent être des **jetons
 * d'enregistrement FCM natifs** — pas des jetons Expo (`ExponentPushToken[…]`),
 * que FCM ne sait pas lire.
 *
 * D'où `getDevicePushTokenAsync()` et non `getExpoPushTokenAsync()`. Sur
 * Android, `expo-notifications` s'appuie sur FCM : le jeton rendu est
 * exactement celui que le serveur sait adresser.
 *
 * ⚠ **iOS n'est pas couvert par ce lot, et il ne faut pas le laisser croire.**
 * Sur iOS, `getDevicePushTokenAsync()` rend un jeton **APNs**, que
 * `send_each_for_multicast` rejette. Le faire fonctionner demande soit
 * `@react-native-firebase/messaging` côté application, soit une branche APNs
 * côté Django — un arbitrage, pas une ligne de code. On n'enregistre donc RIEN
 * sur iOS plutôt que de remplir la table de jetons morts que le serveur
 * essaiera d'adresser à chaque notification.
 *
 * ⚠ **Ni Expo Go, ni le web.** Depuis le SDK 53, Expo Go ne reçoit plus de
 * notification distante sur Android : il faut une version de développement
 * (`eas build --profile development`). Sur le web, la poussée passerait par
 * un service worker et une clé VAPID, que le produit n'a pas. Les deux cas
 * sortent en silence — c'est une absence de fonction, pas une panne.
 */
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import api from "./api";

/**
 * Comment l'application se comporte quand une notification arrive alors
 * qu'elle est AU PREMIER PLAN.
 *
 * Par défaut, rien ne s'affiche — le membre qui lit ses Ndiguels ne verrait
 * pas passer un message du chef. On montre donc la bannière et la pastille,
 * sans son : une notification sonore pendant qu'on tient déjà le téléphone
 * est une intrusion, pas un service.
 */
/*
 * Pas sur le web : `setNotificationHandler` y commanderait un affichage que la
 * plateforme ne rend pas. On ne pose donc rien là où rien ne s'applique.
 *
 * ⚠ Ce garde NE FAIT PAS taire l'avertissement que la console web affiche à
 * chaque chargement — « Listening to push token changes is not yet fully
 * supported on web ». Vérifié : il vient de `TokenEmitter.js:34`, à
 * l'INTÉRIEUR d'expo-notifications, et non d'un appel de ce fichier. Le noter
 * pour ne pas repartir le chercher ici : c'est un bruit de bibliothèque sur
 * une plateforme hors périmètre, pas un symptôme.
 */
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

/** Le jeton effectivement déposé au serveur, pour savoir lequel retirer. */
let jetonEnregistre: string | null = null;

/** Les raisons possibles de ne pas avoir de push, dites en clair. */
export type PushStatus =
  | "enregistre"
  | "refuse"
  | "non-supporte"
  | "erreur";

function deviceType(): "android" | "ios" | "web" {
  if (Platform.OS === "android") return "android";
  if (Platform.OS === "ios") return "ios";
  return "web";
}

/**
 * Les terrains où la poussée ne peut pas fonctionner, écartés AVANT de
 * demander la permission. Réclamer l'autorisation des notifications pour ne
 * rien pouvoir en faire est le genre de demande qui se refuse une fois pour
 * toutes — et une permission refusée ne se redemande pas.
 */
/**
 * Les API de notification DISTANTE existent-elles seulement sur ce terrain ?
 *
 * Question différente de « le push peut-il marcher ». Ici on demande si
 * l'appel ne va pas LEVER. Sur Expo Go depuis le SDK 53, toucher à ces API
 * jette — `addNotificationResponseReceivedListener` compris, qui n'est pas
 * une promesse et dont le refus remonte donc jusqu'au rendu.
 *
 * Constaté sur émulateur : sans ce garde, l'écran rouge d'Expo Go recouvre
 * l'application et l'effet se rejoue — 91 entrées de journal pour une seule
 * session. Le produit devenait intestable là où on le teste le plus.
 */
export function pushDistantDisponible(): boolean {
  if (Platform.OS === "web") return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return true;
}

function terrainViable(): boolean {
  // Web et Expo Go : les API n'existent pas ou lèvent.
  if (!pushDistantDisponible()) return false;
  // Un émulateur n'a pas de service Google Play : le jeton n'arrive jamais.
  if (!Device.isDevice) return false;
  // Voir l'en-tête : un jeton APNs n'est pas adressable par firebase-admin.
  if (Platform.OS === "ios") return false;
  return true;
}

export const PushService = {
  /**
   * Demande la permission, récupère le jeton, le dépose au serveur.
   *
   * Appelé après une connexion réussie et à chaque hydratation de session :
   * un jeton FCM se renouvelle tout seul (réinstallation, restauration de
   * sauvegarde, vidage des données). `update_or_create` côté Django rend
   * l'opération idempotente — la réenvoyer à chaque démarrage est le
   * comportement voulu, pas un doublon.
   */
  async register(): Promise<PushStatus> {
    if (!terrainViable()) return "non-supporte";

    try {
      /*
        Android exige un canal, sinon la notification arrive muette et sans
        priorité. Il se déclare avant la demande de permission.
      */
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Yessal Gui",
          importance: Notifications.AndroidImportance.DEFAULT,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      const { status: existant } = await Notifications.getPermissionsAsync();
      let accorde = existant === "granted";
      if (!accorde) {
        const { status } = await Notifications.requestPermissionsAsync();
        accorde = status === "granted";
      }
      if (!accorde) return "refuse";

      const jeton = await Notifications.getDevicePushTokenAsync();
      const valeur = typeof jeton.data === "string" ? jeton.data : String(jeton.data);
      if (!valeur) return "erreur";

      await api.post("comms/fcm-token/", {
        token: valeur,
        device_type: deviceType(),
      });
      jetonEnregistre = valeur;
      return "enregistre";
    } catch {
      /*
        Muet, et volontairement. L'absence de notifications poussées ne doit
        jamais empêcher de se connecter ni afficher une alerte : le membre n'a
        rien demandé et ne peut rien y faire.
      */
      return "erreur";
    }
  },

  /**
   * Retire le jeton du serveur.
   *
   * ⚠ À APPELER AVANT que la session ne soit détruite : la route exige d'être
   * authentifié, et un `DELETE` sans jeton d'accès part en 401 — le jeton FCM
   * resterait alors en base. Concrètement : le prochain propriétaire du
   * téléphone, ou le membre suivant sur un appareil partagé, recevrait les
   * notifications du précédent. C'est la raison pour laquelle `logout` du
   * store fait le retrait en premier.
   */
  async unregister(): Promise<void> {
    if (!jetonEnregistre) return;
    try {
      await api.delete("comms/fcm-token/", { token: jetonEnregistre });
    } catch {
      /* Le serveur nettoie de son côté les jetons que FCM déclare morts. */
    } finally {
      jetonEnregistre = null;
    }
  },
};

export default PushService;
