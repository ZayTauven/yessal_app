/**
 * lib/campaign-visuals.ts — l'image d'un Ndiguel.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE MODULE A ÉTÉ ÉCRIT SUR UN DIAGNOSTIC FAUX. CORRIGÉ LE 2026-09-04.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il disait : « aucun Ndiguel de la base ne porte d'image, `campaign.image`
 * est `null` partout ». C'était vrai, et pour une raison qui n'avait rien à
 * voir avec la base : **le champ ne s'appelle pas `image`**.
 *
 * Django expose `illustrative_photo` — `events/models.py:39`, déclaré dans
 * `CampaignSerializer.Meta.fields` (`events/serializers.py:57`). Le champ
 * `image` que le mobile interrogeait n'a **jamais existé** dans la réponse de
 * l'API. Il était donc `undefined` quelle que soit la base, et le pis-aller
 * s'appliquait à 100 % des Ndiguels — y compris à ceux qui portaient bel et
 * bien une photographie téléversée depuis l'administration web.
 *
 * L'interface web, elle, lit le bon champ (`CampaignsClient.tsx:386`) et
 * affiche ces photographies depuis toujours. Deux fichiers dorment dans
 * `yessal-backend/media/campaigns/photos/` : la démonstration aurait montré
 * une substitution là où le client attendait sa propre image.
 *
 * ── Ce que fait ce module maintenant ────────────────────────────────────────
 *
 * 1. Il lit `illustrative_photo`. C'est la correction de fond ; le reste n'est
 *    que du pis-aller.
 * 2. Il résout les chemins relatifs. DRF ne rend une URL absolue que si la
 *    requête est dans le contexte du serializer ; sinon il rend `/media/…`.
 *    On ne parie pas là-dessus — un chemin qui commence par `/` est recollé à
 *    l'origine de l'API. Noter que `Config.API_URL` finit par `/api` : c'est
 *    l'ORIGINE qu'il faut, pas le chemin.
 * 3. À défaut seulement, il rend une photographie de la photothèque.
 *
 * ── Le pis-aller, et ce qu'il implique ─────────────────────────────────────
 *
 * Les substitutions sont désormais les portraits de **Sokhna Aïda**, à la
 * demande du commanditaire — elles remplacent les scènes de repas, de marmites
 * et de cuisine qui servaient jusqu'ici. Dans une confrérie, un appel est
 * lancé au nom de la guide : son portrait sur un Ndiguel sans photographie est
 * juste, là où une marmite était muette.
 *
 * ⚠ Cela reste un pis-aller : le portrait ne documente pas la campagne. Il
 * cède la place tout seul dès que `illustrative_photo` existe.
 *
 * ── Une contrainte de géométrie, à connaître avant de changer le jeu ────────
 *
 * Les originaux sont des PORTRAITS verticaux serrés. Une bande 2:1 ne peut pas
 * contenir une tête qui occupe la moitié de la hauteur : sur les six
 * photographies proposées, **quatre seulement** survivent au cadrage large —
 * les deux autres se font décapiter. Les quatre retenues l'ont été pour cette
 * raison, pas par goût. Ne pas en ajouter sans vérifier le rendu 2:1.
 *
 * Chaque sujet porte SES DEUX cadrages, large et carré. Un Ndiguel montre donc
 * la même photographie dans la liste et sur sa carte — la variété d'un tirage
 * indépendant par forme aurait donné l'impression d'un contenu qui bouge.
 */
import type { ImageSource } from "expo-image";

import { Config } from "@/constants/configs";

/**
 * Un sujet, ses deux cadrages. Voir `AGENTS/Design-Analyse-UX/prepare_ndiguel_photos.py`
 * pour la recette — amputation du filigrane, ancrage sur le visage, réencodage.
 */
const ROLL: { wide: ImageSource; square: ImageSource }[] = [
  {
    wide: require("@/assets/photos/ndiguel/aida-sourire-2x1.jpg"),
    square: require("@/assets/photos/ndiguel/aida-sourire-1x1.jpg"),
  },
  {
    wide: require("@/assets/photos/ndiguel/aida-foule-2x1.jpg"),
    square: require("@/assets/photos/ndiguel/aida-foule-1x1.jpg"),
  },
  {
    wide: require("@/assets/photos/ndiguel/aida-drapeau-2x1.jpg"),
    square: require("@/assets/photos/ndiguel/aida-drapeau-1x1.jpg"),
  },
  {
    wide: require("@/assets/photos/ndiguel/aida-profil-2x1.jpg"),
    square: require("@/assets/photos/ndiguel/aida-profil-1x1.jpg"),
  },
];

export type VisualShape = "wide" | "square";

interface HasVisual {
  id: number;
  /** Le champ réel de l'API — `events/models.py:39`. */
  illustrative_photo?: string | null;
}

/** L'origine du serveur, sans le `/api` final : `/media/…` s'y raccroche. */
const ORIGIN = Config.API_URL.replace(/\/api\/?$/, "");

/**
 * Rend l'URL téléversée exploitable par `expo-image`, ou `null` si elle ne
 * ressemble à rien. Une chaîne vide traverserait le `if` de l'appelant sans
 * être une image.
 */
function serverPhoto(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${ORIGIN}/${url.replace(/^\/+/, "")}`;
}

/**
 * L'image à afficher pour un Ndiguel : la sienne si elle existe, sinon une
 * photographie choisie de façon STABLE sur l'identifiant — un Ndiguel garde la
 * même d'un écran à l'autre et d'un lancement au suivant.
 */
export function campaignVisual(
  campaign: HasVisual,
  shape: VisualShape = "wide",
): ImageSource {
  const own = serverPhoto(campaign.illustrative_photo);
  if (own) return { uri: own };

  /** `Math.abs` : un identifiant négatif ne doit pas sortir du tableau. */
  return ROLL[Math.abs(campaign.id) % ROLL.length][shape];
}

/** Vrai quand l'image affichée est un pis-aller, pas celle du Ndiguel. */
export function isFallbackVisual(campaign: HasVisual): boolean {
  return serverPhoto(campaign.illustrative_photo) === null;
}
