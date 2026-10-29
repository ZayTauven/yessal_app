/**
 * La carte d'un Jëf dans « Les Jëfs du Kourel », et le lecteur de note vocale.
 *
 * Même parti que le web (`ChannelCards.tsx`) : le serveur choisit la variante
 * (`comms/canaux.py`), l'application l'habille — photo du Ndiguel,
 * pictogramme de la marque sur fond pastel, palier atteint, diaspora. Validé
 * sur maquette le 2026-10-29 : pas de « format robotique » répété.
 *
 * Les pictogrammes sont ceux du dossier `assets/pictos` (Noun Project,
 * attribution dans `assets/pictos/ATTRIBUTION.md`).
 */
import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { HandHeart, Pause, Play } from "lucide-react-native";

import type { JefCard as Card, Message } from "@/types/content.types";
import { Font, Ink, Radius, Space, Surface, Type, Violet } from "@/theme";

const PICTOS: Record<string, ImageSourcePropType> = {
  generosite: require("@/assets/pictos/generosite.png"),
  "main-tendue": require("@/assets/pictos/main-tendue.png"),
  repas: require("@/assets/pictos/repas.png"),
  collecte: require("@/assets/pictos/collecte.png"),
  proche: require("@/assets/pictos/proche.png"),
  appel: require("@/assets/pictos/appel.png"),
  diaspora: require("@/assets/pictos/diaspora.png"),
};
const CONFETTIS: ImageSourcePropType = require("@/assets/images/confettis.png");

/** Fond, encre et encre douce de chaque ton — 4,5:1 au moins sur le fond. */
const TONES: Record<NonNullable<Card["tone"]>, { bg: string; ink: string; soft: string }> = {
  peach: { bg: "#FFE7D3", ink: "#3A2410", soft: "#6B4A2A" },
  yellow: { bg: "#FFF4BF", ink: "#3A3006", soft: "#5E4F12" },
  teal: { bg: "#DDF4F4", ink: "#10393A", soft: "#2C5A5B" },
  pink: { bg: "#FFE3F2", ink: "#4A1232", soft: "#6E2A50" },
  lilac: { bg: "#ECE6FB", ink: Violet[900], soft: Violet[700] },
};

function formatTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Le nom du donateur, en gras et suivi de son titre, quand il l'a rendu public. */
function CardText({ message, card, color }: { message: Message; card: Card; color: string }) {
  const name = card.donor?.name;
  if (!name || !message.content.includes(name)) {
    return <Text style={[styles.text, { color }]}>{message.content}</Text>;
  }
  const [before, ...rest] = message.content.split(name);
  return (
    <Text style={[styles.text, { color }]}>
      {before}
      <Text style={styles.strong}>{name}</Text>
      {card.donor?.title ? <Text style={styles.titleTag}> {card.donor.title.toUpperCase()} </Text> : null}
      {rest.join(name)}
    </Text>
  );
}

export function JefCardView({ message, footer }: { message: Message; footer?: React.ReactNode }) {
  const card = message.payload as Card;
  const time = formatTime(message.sent_at);

  if (card.variant === "palier") {
    return (
      <View style={[styles.card, styles.palier]}>
        <Image source={CONFETTIS} style={styles.confettis} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.palierBadge}>PALIER ATTEINT</Text>
        <Text style={styles.palierNumber}>{card.milestone}e Jëf</Text>
        <Text style={styles.palierText}>pour {card.campaign_name}. Alhamdoulillah !</Text>
        <View style={styles.footer}>
          {footer}
          <Text style={[styles.time, { color: Violet[200] }]}>{time}</Text>
        </View>
      </View>
    );
  }

  if (card.variant === "photo" && card.photo_url) {
    return (
      <View style={[styles.card, styles.photoCard]}>
        <View>
          <Image source={{ uri: card.photo_url }} style={styles.photo} resizeMode="cover" accessibilityLabel={`Ndiguel ${card.campaign_name}`} />
          <Text style={styles.photoBadge} numberOfLines={1}>
            Ndiguel · {card.campaign_name}
          </Text>
        </View>
        <View style={styles.photoBody}>
          <CardText message={message} card={card} color={Ink[900]} />
          <View style={styles.footer}>
            {footer}
            <Text style={[styles.time, { color: Ink[500] }]}>{time}</Text>
          </View>
        </View>
      </View>
    );
  }

  const tone = TONES[card.tone ?? (card.variant === "diaspora" ? "teal" : "lilac")] ?? TONES.lilac;
  return (
    <View style={[styles.card, styles.tile, { backgroundColor: tone.bg }]}>
      <View style={styles.pictoBox}>
        {card.picto && PICTOS[card.picto] ? (
          <Image source={PICTOS[card.picto]} style={styles.picto} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <HandHeart size={34} color={Violet[900]} strokeWidth={1.5} />
        )}
      </View>
      <View style={styles.tileBody}>
        <CardText message={message} card={card} color={tone.ink} />
        <View style={styles.footer}>
          {footer}
          <Text style={[styles.time, { color: tone.soft }]}>{time}</Text>
        </View>
      </View>
    </View>
  );
}

/** Une note vocale : lecture, progression, durée. */
export function AudioBubble({ url, mine = false }: { url: string; mine?: boolean }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // Revenue au début une fois lue, prête à être réécoutée.
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  const progress = status.duration ? status.currentTime / status.duration : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const bars = Array.from({ length: 22 }, (_, i) => 6 + ((url.charCodeAt(i % url.length) * (i + 3)) % 18));
  const played = mine ? Violet[900] : Violet[700];
  const pending = mine ? "rgba(47,25,102,0.35)" : Violet[300];

  return (
    <View style={styles.audio}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Mettre en pause la note vocale" : "Écouter la note vocale"}
        style={[styles.audioBtn, { backgroundColor: mine ? Surface.default : Violet[700] }]}
        hitSlop={Space.xs}
      >
        {status.playing ? (
          <Pause size={15} color={mine ? Violet[900] : Surface.default} fill={mine ? Violet[900] : Surface.default} />
        ) : (
          <Play size={15} color={mine ? Violet[900] : Surface.default} fill={mine ? Violet[900] : Surface.default} />
        )}
      </Pressable>
      <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {bars.map((h, i) => (
          <View key={i} style={[styles.bar, { height: h, backgroundColor: i / bars.length <= progress ? played : pending }]} />
        ))}
      </View>
      <Text style={[styles.audioTime, { color: mine ? Violet[900] : Ink[500] }]}>
        {fmt(status.playing || status.currentTime ? status.currentTime : status.duration || 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, overflow: "hidden" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Space.sm, marginTop: Space.sm },
  time: { ...Type.micro },
  text: { ...Type.body, fontSize: 14, lineHeight: 20 },
  strong: { fontFamily: Font.bold },
  titleTag: { fontSize: 9, fontFamily: Font.extrabold, color: Violet[700], backgroundColor: Violet[100] },

  palier: { backgroundColor: Violet[900], padding: Space.lg },
  confettis: { position: "absolute", right: -16, top: -12, width: 150, height: 120, opacity: 0.9 },
  palierBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.chip,
    overflow: "hidden",
    backgroundColor: Violet[300],
    color: Violet[900],
    fontSize: 11,
    fontFamily: Font.extrabold,
  },
  palierNumber: { marginTop: Space.sm, fontSize: 26, fontFamily: Font.extrabold, color: Surface.default },
  palierText: { ...Type.label, color: Violet[100] },

  photoCard: { backgroundColor: Surface.default, borderWidth: 1, borderColor: "#ECEAE4" },
  photo: { width: "100%", height: 128 },
  photoBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    maxWidth: "85%",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.chip,
    overflow: "hidden",
    backgroundColor: Surface.default,
    color: Violet[900],
    fontSize: 11,
    fontFamily: Font.bold,
  },
  photoBody: { padding: Space.md },

  tile: { flexDirection: "row", alignItems: "center", gap: 14, padding: Space.md },
  pictoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Surface.default,
    alignItems: "center",
    justifyContent: "center",
  },
  picto: { width: 52, height: 52 },
  tileBody: { flex: 1, minWidth: 0 },

  audio: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 210 },
  audioBtn: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  wave: { flex: 1, height: 28, flexDirection: "row", alignItems: "center", gap: 2 },
  bar: { width: 3, borderRadius: 2 },
  audioTime: { ...Type.micro, fontVariant: ["tabular-nums"], minWidth: 30, textAlign: "right" },
});
