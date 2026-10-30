/**
 * La fenêtre de suivi de Sangue Bi, la guide du Kourel (`/api/suivi/`).
 * Lecture seule ; ses annonces passent par la messagerie.
 */
import api from "./api";
import { ContentService } from "./content.service";
import type {
  Periode,
  RepartitionPar,
  SuiviDaara,
  SuiviOverview,
  SuiviRepartition,
} from "@/types/suivi.types";

export const SuiviService = {
  getSuivi(periode: Periode) {
    return api.get<SuiviOverview>(`suivi/?periode=${periode}`);
  },

  getRepartition(par: RepartitionPar, periode: Periode) {
    return api.get<SuiviRepartition>(`suivi/repartition/?par=${par}&periode=${periode}`);
  },

  getDaara(id: number, periode: Periode) {
    return api.get<SuiviDaara>(`suivi/daara/${id}/?periode=${periode}`);
  },

  /** Le canal « Annonces de Sangue Bi » ; `null` s'il n'existe pas. */
  async getGuideChannel() {
    const chats = await ContentService.getChats();
    return chats.find((chat) => chat.channel_kind === "guide") ?? null;
  },
};
