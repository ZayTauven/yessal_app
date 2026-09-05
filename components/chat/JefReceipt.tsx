/**
 * JefReceipt — le « Reçu de Jëf » du fil de conversation.
 *
 * Planche « Accueil et Onglets », vue `isChat`, ligne ~470 : montant, Ndiguel,
 * référence. Ce n'est PAS une bulle de texte — personne ne l'a écrite. C'est
 * une trace de don posée dans le fil, à la place et au moment où elle a eu
 * lieu.
 *
 * ── D'où viennent ces trois lignes, et de nulle part ailleurs ───────────────
 *
 * `comms/` n'a aucun type de message « reçu » : `Message.MessageType` ne
 * connaît que `text`, `file` et `system` (`comms/models.py:73`). Le seul lien
 * que le backend offre entre une conversation et une collecte est
 * `Chat.campaign` (`comms/models.py:22`). Le reçu est donc construit à partir
 * d'un VRAI don — `contributions/`, filtré sur le Ndiguel de la conversation et
 * sur le donateur courant. Sans don, pas de carte : elle n'est jamais
 * fabriquée pour meubler le fil.
 *
 * ── Le montant, et la règle des rôles ──────────────────────────────────────
 *
 * Aucun masquage ici, et c'est voulu. `canSeeAmounts` cache à un talibé les
 * sommes COLLECTÉES par le Daara ; son propre Jëf lui appartient. La carte
 * n'est d'ailleurs rendue que pour les dons dont il est le donateur.
 *
 * Le chiffre reste violet-900 et non vert : `montant` (#1A5C3A) ne tient que
 * 3,4:1 sur le violet-300 de la carte. Le jeton dit la même chose pour la
 * photographie — « le vert ne s'applique que sur fond clair ».
 */
import { StyleSheet, Text, View } from "react-native";

import { formatFCFA } from "@/lib/format";
import { formatBubbleTime } from "./MessageBubble";
import type { Donation } from "@/types/donation.types";
import {
  Font,
  Radius,
  Space,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

/** Même bec que la bulle émise — le reçu vient du même côté. */
const BEAK = 6;

interface JefReceiptProps {
  donation: Donation;
  /** Nom du Ndiguel. `campaign_name` du serializer, quand il est renseigné. */
  campaignName?: string | null;
}

export function JefReceipt({ donation, campaignName }: JefReceiptProps) {
  /*
    La référence est celle du prestataire de paiement quand il en a rendu une,
    sinon le numéro du don. On n'en INVENTE pas : la planche affiche
    « YG-26-0K4M18 », un code de démonstration que le serveur ne saurait pas
    relire si l'utilisateur le citait. Même arbitrage qu'à l'étape de
    confirmation du Jëf.
  */
  const reference = donation.external_ref?.trim() || `Jëf n° ${donation.id}`;
  const subtitle = [campaignName?.trim(), reference].filter(Boolean).join(" · ");

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.overline}>Reçu de Jëf</Text>
      <Text style={styles.amount} selectable>
        {formatFCFA(donation.amount)}
      </Text>
      <Text style={styles.subtitle} selectable>
        {subtitle}
      </Text>
      <Text style={styles.time}>{formatBubbleTime(donation.created_at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "flex-end",
    maxWidth: "78%",
    backgroundColor: Violet[300],
    borderRadius: Radius.card,
    borderBottomRightRadius: BEAK,
    ...continuous,
    paddingHorizontal: Space.lg,
    paddingVertical: 14,
    gap: Space.sm,
  },
  overline: {
    ...UIType.badgeLabel,
    fontFamily: Font.semibold,
    letterSpacing: 0.88, // 0,08em sur 11
    textTransform: "uppercase",
    color: Violet[700],
  },
  amount: { ...Type.amountCard, color: Violet[900] },
  subtitle: { ...Type.label, fontFamily: Font.semibold, color: Violet[900] },
  time: { ...Type.micro, alignSelf: "flex-end", color: Violet[700] },
});
