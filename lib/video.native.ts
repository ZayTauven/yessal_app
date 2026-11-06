import { File } from "expo-file-system";
import { createVideoThumbnail, getVideoMetaData, Video } from "react-native-compressor";

import { ErreurLisible } from "@/lib/api";
import { formatPoids, PLAFOND_VIDEO_OCTETS, PLAFOND_VIDEO_MO } from "@/lib/upload";
import type { Attachment } from "@/types/content.types";

import { VideoAnnulee, type SourceVideo, type SuiviPreparation } from "./video.types";

/**
 * La vidéo telle qu'elle partira : réduite ici, sur le téléphone.
 *
 * Le coût, d'abord : une image en 720p, moins nette que l'originale, et une
 * attente avant l'envoi. Le gain : environ 15 Mo par minute au lieu de 130, pour
 * le disque du serveur comme pour les données de chaque membre qui la regarde.
 * Le serveur, lui, n'y consacre aucun calcul : il n'a que 2 cœurs, partagés.
 *
 * Les pièces d'identité et les photos ne passent jamais par ici.
 */
const COTE_MAX = 1280;
const DEBIT_VIDEO = 2_000_000;
const DEBIT_AUDIO = 128_000;
/** En dessous, une vidéo déjà légère ne perdrait rien à rester telle quelle. */
const DEBIT_TOLERE = DEBIT_VIDEO * 1.25;
/** Au-delà, le serveur ignore l'aperçu (`VIGNETTE_POIDS_MAX`). */
const VIGNETTE_POIDS_MAX = 512 * 1024;

function effacer(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    /* Le cache du système finira par s'en charger. */
  }
}

function nomDe(uri: string): string {
  return decodeURIComponent(uri.split("?")[0].split("/").pop() ?? "") || `video-${Date.now()}.mp4`;
}

async function fabriquerApercu(uri: string) {
  try {
    const vignette = await createVideoThumbnail(uri);
    const chemin = vignette.path.startsWith("file://") ? vignette.path : `file://${vignette.path}`;
    const fichier = new File(chemin);
    if (fichier.size > VIGNETTE_POIDS_MAX) return { thumbnailUri: chemin, thumbnailB64: null };
    return { thumbnailUri: chemin, thumbnailB64: await fichier.base64() };
  } catch {
    /* Le fil sait afficher une vidéo sans aperçu : ce n'est pas une raison d'échouer. */
    return { thumbnailUri: null, thumbnailB64: null };
  }
}

export async function preparerVideo(source: SourceVideo, suivi: SuiviPreparation = {}): Promise<Attachment> {
  const meta = await getVideoMetaData(source.uri).catch(() => null);
  const taille = source.size ?? meta?.size ?? new File(source.uri).size ?? 0;
  const duree = source.durationSeconds ?? meta?.duration ?? null;
  const debit = duree ? (taille * 8) / duree : null;

  /* Refuser AVANT de compresser : dix minutes de batterie pour annoncer ensuite
     que c'était trop long seraient la pire réponse possible. */
  if (duree) {
    const debitFinal = debit ? Math.min(debit, DEBIT_VIDEO + DEBIT_AUDIO) : DEBIT_VIDEO + DEBIT_AUDIO;
    if ((duree * debitFinal) / 8 > PLAFOND_VIDEO_OCTETS) {
      const minutes = Math.floor((PLAFOND_VIDEO_OCTETS * 8) / debitFinal / 60);
      if (/\/cache\//.test(source.uri)) effacer(source.uri);
      throw new ErreurLisible(`Cette vidéo est trop longue : environ ${minutes} minutes au maximum peuvent être envoyées.`);
    }
  }

  const estMp4 = /\.mp4$/i.test(source.name ?? source.uri);
  /* C'est le débit qui coûte des données, pas la résolution : une vidéo en 1080p à
     2 Mbit/s ressortait PLUS lourde de la compression (30,5 → 34,1 Mo, constaté). */
  const dejaLegere = estMp4 && debit !== null && debit <= DEBIT_TOLERE;
  /* Les sélecteurs copient la vidéo dans le cache de l'application. */
  const sourceEnCache = /\/cache\//.test(source.uri);

  let uri = source.uri;
  let temporaire = sourceEnCache;
  if (!dejaLegere) {
    let idAnnulation: string | null = null;
    let annulee = false;
    suivi.onCancelReady?.(() => {
      annulee = true;
      if (idAnnulation) Video.cancelCompression(idAnnulation);
    });
    try {
      const reduite = await Video.compress(
        source.uri,
        {
          compressionMethod: "manual",
          maxSize: COTE_MAX,
          bitrate: DEBIT_VIDEO,
          /* Une vidéo de téléphone porte le lieu du tournage : il n'a rien à faire
             sur un fil de discussion. */
          preserveMetadata: false,
          progressDivider: 5,
          getCancellationId: (id) => {
            idAnnulation = id;
          },
        },
        (progres) => suivi.onProgress?.(Math.round(progres * 100)),
      );
      /* Réduire n'a de sens que si le résultat est plus léger : sinon l'original,
         de meilleure qualité, part à sa place. */
      if (new File(reduite).size < taille) {
        uri = reduite;
        temporaire = true;
        if (sourceEnCache) effacer(source.uri);
      } else {
        effacer(reduite);
      }
    } catch (cause) {
      if (annulee) {
        if (sourceEnCache) effacer(source.uri);
        throw new VideoAnnulee();
      }
      /* Un format que le téléphone ne sait pas réencoder : on tente l'original,
         s'il tient dans le plafond. */
      if (taille > PLAFOND_VIDEO_OCTETS) {
        throw new ErreurLisible("Cette vidéo n'a pas pu être préparée pour l'envoi. Essayez-en une plus courte.", { cause });
      }
    }
    if (annulee) {
      if (sourceEnCache) effacer(source.uri);
      throw new VideoAnnulee();
    }
  }

  const fichier = new File(uri);
  const poids = fichier.exists ? fichier.size : taille;
  if (poids > PLAFOND_VIDEO_OCTETS) {
    throw new ErreurLisible(
      `Cette vidéo fait encore ${formatPoids(poids)} une fois réduite : la taille maximale est de ${PLAFOND_VIDEO_MO} Mo. Essayez-en une plus courte.`,
    );
  }

  return {
    uri,
    name: nomDe(uri),
    mimeType: uri === source.uri ? source.mimeType ?? "video/mp4" : "video/mp4",
    kind: "video",
    size: poids,
    duration: duree ? Math.round(duree) : null,
    temporaire,
    ...(await fabriquerApercu(uri)),
  };
}

/** Rend au téléphone la place de la copie réduite, une fois la vidéo partie. */
export function libererApresEnvoi(piece?: Attachment | null): void {
  if (!piece) return;
  if (piece.temporaire) effacer(piece.uri);
  if (piece.thumbnailUri) effacer(piece.thumbnailUri);
}
