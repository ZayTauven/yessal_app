/**
 * lib/pending-route.ts — la mémoire du lien profond reçu déconnecté.
 *
 * LE PROBLÈME. Un membre reçoit par WhatsApp le lien d'un Ndiguel,
 * `/campaign/5`. Il ouvre l'application, qui n'a pas de session : la garde de
 * `app/(app)/_layout.tsx` le renvoie à la connexion. S'il se connecte et
 * atterrit sur l'accueil, le lien est perdu — il doit retrouver le Ndiguel à la
 * main, en supposant qu'il se souvienne duquel il s'agissait.
 *
 * LA DÉCISION (§7, point 7). On mémorise la cible au moment du refus, et on la
 * rejoue après la connexion. Rejeter le lien serait plus simple à écrire et
 * plus pauvre à l'usage : le partage par messagerie est le premier canal de
 * diffusion d'un Ndiguel.
 *
 * OÙ. Dans le stockage persistant du projet (`lib/storage.ts` — SecureStore sur
 * l'appareil, `localStorage` sur le web), et non dans un état en mémoire. La
 * raison tient au scénario lui-même : le lien LANCE l'application, donc le
 * processus vient de naître ; et entre le lien et la connexion l'utilisateur
 * sort souvent de l'application — chercher un mot de passe, lire un SMS. Sur
 * Android, une sortie sous pression mémoire tue le processus et un état en
 * mémoire disparaît avec lui, précisément dans le cas qu'on veut servir.
 *
 * LE PRIX DE LA PERSISTANCE, ET SA CONTREPARTIE. Une cible qui survit au
 * redémarrage peut survivre trop longtemps : rejouer à la connexion de mardi un
 * lien reçu vendredi serait déroutant. D'où `TTL_MS` — dix minutes. C'est large
 * pour une connexion, court pour une mémoire. Passé ce délai la cible est
 * ignorée et l'utilisateur va à l'accueil, comme avant.
 *
 * SÉCURITÉ. On ne rejoue qu'un chemin INTERNE et connu. `isReplayable` est une
 * liste blanche, pas un filtre de caractères interdits : tout ce qui n'y figure
 * pas est écarté. Une valeur trafiquée dans le stockage, une URL absolue, un
 * `..` — rien de tout cela ne peut devenir une redirection.
 */
import type { Href } from "expo-router";

import { Storage } from "./storage";

const KEY = "yessal_pending_route";

/** Dix minutes. Voir l'en-tête : large pour une connexion, court pour une mémoire. */
const TTL_MS = 10 * 60 * 1000;

/** Un chemin plus long que ça n'est pas un lien de Ndiguel, c'est du bruit. */
const MAX_LENGTH = 512;

/**
 * Les routes de `app/(app)/` — celles, et seulement celles, que la garde peut
 * refuser puis rejouer. À tenir à jour quand une route est ajoutée sous
 * `(app)/` : une route absente d'ici n'est jamais rejouée, l'utilisateur
 * retombe sur l'accueil. C'est le sens de défaillance qu'on veut.
 */
const EXACT_ROUTES: ReadonlySet<string> = new Set([
  // les quatre onglets
  "/home",
  "/campaigns",
  "/chat",
  "/profile",
  // la feuille Jëf et les destinations de pile
  "/donate",
  "/daara",
  "/donations",
  "/explore",
  "/events",
  "/notifications",
  "/announcements",
  // les deux écrans de profil
  "/profile/documents",
  "/profile/tutelle",
]);

/** Un segment dynamique : identifiant ou limace, sans séparateur de chemin. */
const SEGMENT = String.raw`[A-Za-z0-9._~%@+-]+`;

/**
 * `/campaign/etat-5` est couvert par `/campaign/<segment>` : les deux sont des
 * routes réelles, il n'y a rien à distinguer ici.
 */
const DYNAMIC_ROUTES: readonly RegExp[] = [
  new RegExp(`^/campaign/${SEGMENT}$`),
  new RegExp(`^/chat/${SEGMENT}$`),
  new RegExp(`^/event/${SEGMENT}$`),
  new RegExp(`^/news/${SEGMENT}$`),
];

/**
 * Le chemin est-il une route interne connue ? Appelée à l'écriture ET à la
 * lecture : ce qui est relu vient du disque, donc d'une source qui a pu être
 * modifiée entre-temps.
 */
export function isReplayable(target: string): boolean {
  if (typeof target !== "string") return false;
  if (target.length === 0 || target.length > MAX_LENGTH) return false;

  // Un chemin interne, et rien d'autre. `//hôte` et `/\hôte` sont des URL
  // absolues déguisées ; un antislash n'a rien à faire dans un chemin.
  if (!target.startsWith("/")) return false;
  if (target.startsWith("//")) return false;
  if (target.includes("\\")) return false;

  const path = target.split(/[?#]/, 1)[0];

  // Aucune remontée d'arborescence, encodée ou non.
  for (const segment of path.split("/")) {
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return false; // un pourcentage mal formé : on n'essaie pas de deviner
    }
    if (decoded === "." || decoded === "..") return false;
    if (decoded.includes("/") || decoded.includes("\\")) return false;
  }

  if (EXACT_ROUTES.has(path)) return true;
  return DYNAMIC_ROUTES.some((route) => route.test(path));
}

interface StoredTarget {
  href: string;
  /** Millisecondes epoch, pour la péremption. */
  at: number;
}

/**
 * Mémorise la cible refusée. Sans attente : la garde rend un `<Redirect>` dans
 * la foulée, l'écriture n'a pas à retenir la navigation. Une erreur de stockage
 * ne coûte que le rejeu — l'utilisateur ira à l'accueil.
 */
export function rememberPendingRoute(target: string): void {
  if (!isReplayable(target)) return;
  const payload: StoredTarget = { href: target, at: Date.now() };
  void Storage.setItemAsync(KEY, JSON.stringify(payload)).catch(() => {});
}

/** Efface la mémoire sans la lire. */
export async function clearPendingRoute(): Promise<void> {
  try {
    await Storage.deleteItemAsync(KEY);
  } catch {
    /* rien à faire : une mémoire qu'on n'arrive pas à effacer périmera seule */
  }
}

/**
 * Lit la cible ET l'efface — d'où « consume ». L'effacement précède la
 * validation : une entrée corrompue ne doit pas se représenter à chaque
 * connexion.
 *
 * Rend `null` quand il n'y a rien, quand la cible a plus de `TTL_MS`, ou quand
 * elle ne correspond à aucune route connue. L'appelant va alors à l'accueil.
 */
export async function consumePendingRoute(): Promise<Href | null> {
  let raw: string | null = null;
  try {
    raw = await Storage.getItemAsync(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  await clearPendingRoute();

  let stored: StoredTarget;
  try {
    stored = JSON.parse(raw) as StoredTarget;
  } catch {
    return null;
  }

  if (typeof stored?.at !== "number" || Date.now() - stored.at > TTL_MS) return null;
  if (!isReplayable(stored.href)) return null;

  /**
   * Le seul cast du module. `typedRoutes` fait de `Href` une union de gabarits
   * littéraux, qu'une chaîne lue sur le disque ne peut pas satisfaire à la
   * compilation. `isReplayable` vient de vérifier ce que le type ne peut pas :
   * que la chaîne est bien l'une de ces routes.
   */
  return stored.href as Href;
}
