/**
 * hooks/usePushNavigation.ts — ce qui se passe quand on TAPE la notification.
 *
 * Une notification qui ouvre l'accueil ne sert à rien : le membre a tapé
 * « Nouveau Ndiguel » et doit atterrir sur le Ndiguel. Ce crochet fait le seul
 * travail qui reste après la réception — traduire la charge du serveur en
 * route, et y aller.
 *
 * ── Le piège de la charge : elle est écrite pour le WEB ─────────────────────
 *
 * `comms/signals.py:114` envoie `data: {'url': '/dashboard/notifications'}` —
 * un chemin du tableau de bord, qui n'existe pas ici. On le TRADUIT plutôt que
 * de demander à Django de changer : cette charge est celle que le web consomme
 * déjà, et la casser pour le mobile déplacerait simplement le problème.
 *
 * ── Les deux façons d'ouvrir, et il en manquait toujours une ────────────────
 *
 * Une notification tapée pendant que l'application VIT arrive par l'écouteur.
 * Une notification tapée alors que l'application était FERMÉE la démarre, et
 * l'écouteur n'existe pas encore quand l'événement passe : il faut interroger
 * `getLastNotificationResponseAsync()`. Ne traiter que le premier cas est
 * l'oubli classique — et c'est justement le cas le plus fréquent, puisqu'on
 * tape une notification quand on n'est pas déjà dans l'application.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

import { chargerNotifications } from "@/lib/push.service";
import type { Href } from "expo-router";
/*
 * ⚠ `import type` — voir l'en-tête de `lib/push.service.ts`. Un import de
 * valeur ici suffit à empêcher l'application de DÉMARRER sous Expo Go, et ce
 * crochet est monté par `app/(app)/_layout.tsx`, c'est-à-dire sur tout écran
 * authentifié. Le module se charge par `chargerNotifications()`, jamais autrement.
 */
import type * as NotificationsModule from "expo-notifications";

/**
 * Traduit un chemin du tableau de bord en route mobile.
 *
 * Renvoie `null` quand la destination n'a pas d'équivalent — on ouvre alors
 * les Notifications, qui est toujours une réponse honnête : le membre y
 * retrouve ce dont on venait de le prévenir.
 */
export function routeDepuisUrl(url: unknown): Href | null {
  if (typeof url !== "string" || !url) return null;

  // « /dashboard/xxx » → « /xxx ». Le reste des chemins passe tel quel.
  const chemin = url.replace(/^\/dashboard(?=\/|$)/, "") || "/";

  const exactes: Record<string, Href> = {
    "/": "/home",
    "/notifications": "/notifications",
    "/chat": "/chat",
    "/campaigns": "/campaigns",
    "/donations": "/donations",
    "/news": "/explore",
    "/daara": "/daara",
    "/members": "/daara",
    "/tutelles": "/profile/tutelle",
    "/profile": "/profile",
    "/events": "/events",
  };
  if (exactes[chemin]) return exactes[chemin];

  /*
    Les chemins à identifiant. On ne les compose qu'à partir d'un identifiant
    réellement numérique : router vers `/campaign/undefined` ouvrirait un
    écran d'erreur, ce qui est pire que d'ouvrir les Notifications.
  */
  const parametres: [RegExp, (id: string) => Href][] = [
    [/^\/campaigns?\/(\d+)(?:\/etat)?$/, (id) => `/campaign/${id}` as Href],
    [/^\/chat\/(\d+)$/, (id) => `/chat/${id}` as Href],
    [/^\/events?\/(\d+)$/, (id) => `/event/${id}` as Href],
  ];
  for (const [motif, construire] of parametres) {
    const trouve = chemin.match(motif);
    if (trouve) return construire(trouve[1]);
  }

  // Les articles se désignent par un limaçon, pas par un nombre.
  const article = chemin.match(/^\/news\/([\w-]+)$/);
  if (article) return `/news/${article[1]}` as Href;

  return null;
}

export function usePushNavigation() {
  const router = useRouter();
  /* Une notification de démarrage ne doit être jouée qu'une fois. */
  const demarrageTraite = useRef(false);

  useEffect(() => {
    /*
      Même garde que l'enregistrement du jeton, et pour la même raison : sur
      Expo Go, ces API LÈVENT au lieu de rendre un résultat vide. Le test du
      seul `web` laissait passer Expo Go, et l'écran rouge y recouvrait
      l'application à chaque montage.

      `chargerNotifications()` porte maintenant les deux moitiés du garde : il
      répond `null` quand le terrain ne s'y prête pas, ET il n'a même pas tenté
      le `require` dans ce cas — c'est ce second point qui rend l'émulateur
      utilisable.
    */
    const Notifications = chargerNotifications();
    if (!Notifications) return;

    function ouvrir(reponse: NotificationsModule.NotificationResponse | null) {
      if (!reponse) return;
      const data = reponse.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      router.push(routeDepuisUrl(data?.url) ?? "/notifications");
    }

    /*
      L'application était fermée : l'événement est déjà passé, on le récupère.
      Le drapeau évite de rejouer la même notification à chaque remontage —
      `getLastNotificationResponseAsync` garde la dernière réponse tant qu'une
      autre n'arrive pas.
    */
    if (!demarrageTraite.current) {
      demarrageTraite.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then(ouvrir)
        .catch(() => {
          /* Aucune notification de démarrage : le cas courant. */
        });
    }

    /*
      La ceinture, en plus du garde : `addNotificationResponseReceivedListener`
      est SYNCHRONE. Ce qu'il jette ne tombe dans aucun `.catch()` et remonte
      jusqu'au rendu — c'est ce qui produisait l'écran rouge. Un tap sur une
      notification qu'on ne peut de toute façon pas recevoir ne vaut pas de
      casser l'écran d'accueil.
    */
    let abonnement: NotificationsModule.EventSubscription | null = null;
    try {
      abonnement = Notifications.addNotificationResponseReceivedListener(ouvrir);
    } catch {
      /* Terrain sans notifications distantes : rien à écouter. */
    }
    return () => abonnement?.remove();
  }, [router]);
}
