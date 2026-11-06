import type { Attachment } from "@/types/content.types";

import type { SourceVideo, SuiviPreparation } from "./video.types";

/**
 * Version web d'Expo, qui ne sert qu'aux aperçus de développement : le module de
 * compression n'existe que sur téléphone (`video.native.ts`). La vidéo y passe
 * telle quelle.
 */
export async function preparerVideo(source: SourceVideo, _suivi: SuiviPreparation = {}): Promise<Attachment> {
  return {
    uri: source.uri,
    name: source.name ?? `video-${Date.now()}.mp4`,
    mimeType: source.mimeType ?? "video/mp4",
    kind: "video",
    size: source.size ?? null,
    duration: source.durationSeconds ?? null,
  };
}

export function libererApresEnvoi(_piece?: Attachment | null): void {}
