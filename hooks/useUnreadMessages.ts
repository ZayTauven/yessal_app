/**
 * hooks/useUnreadMessages.ts — le total des messages non lus.
 *
 * Il allume la pastille de l'onglet Messages et le chiffre sur l'icône de
 * l'application. Jusqu'ici rien ne disait, hors de l'onglet, qu'un message
 * attendait.
 *
 * Le total vient du serveur (`comms/unread/`, sans les fils en sourdine) ; le
 * temps réel ne fait que le redemander, regroupé sur une seconde — un salon
 * qui s'anime ne déclenche qu'un appel :
 *
 *   private-user.{moi}   chat-updated · chat-read (lu ici ou sur un autre appareil)
 *   private-kourel       chat-updated (canaux du Kourel)
 */
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { ContentService } from "@/lib/content.service";
import { chargerNotifications } from "@/lib/push.service";
import { listen, onReconnect } from "@/lib/realtime";

const REGROUPEMENT_MS = 1000;

export function useUnreadMessages(userId?: number | null) {
  const [total, setTotal] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const refresh = async () => {
      try {
        const summary = await ContentService.getUnreadSummary();
        if (!active) return;
        setTotal(summary.total);
        // Le chiffre sur l'icône de l'application, comme toute messagerie.
        chargerNotifications()?.setBadgeCountAsync(summary.total).catch(() => undefined);
      } catch {
        /* Réseau absent : la pastille garde sa dernière valeur. */
      }
    };
    const soon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(refresh, REGROUPEMENT_MS);
    };

    void refresh();
    const offUser = listen(`private-user.${userId}`, { "chat-updated": soon as never, "chat-read": soon as never });
    const offKourel = listen("private-kourel", { "chat-updated": soon as never });
    const offReconnect = onReconnect(soon);
    const sub = AppState.addEventListener("change", (state) => state === "active" && soon());

    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      offUser();
      offKourel();
      offReconnect();
      sub.remove();
    };
  }, [userId]);

  return total;
}
