export type SourceVideo = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
  durationSeconds?: number | null;
};

export type SuiviPreparation = {
  onProgress?: (percent: number) => void;
  /** Reçoit la fonction qui interrompt la compression en cours. */
  onCancelReady?: (cancel: () => void) => void;
};

/** La compression a été interrompue par le membre : ce n'est pas une erreur à lui montrer. */
export class VideoAnnulee extends Error {
  constructor() {
    super("Préparation de la vidéo annulée.");
    this.name = "VideoAnnulee";
  }
}
