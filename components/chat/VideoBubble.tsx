import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Play, X } from "lucide-react-native";

import { formatDuree, formatPoids } from "@/lib/upload";
import { Font, Space, Type, Violet } from "@/theme";

/**
 * Une vidéo dans le fil : son aperçu, sa durée et son poids.
 *
 * Rien n'est téléchargé avant l'appui, et c'est le but de ce composant : dans un
 * canal de plusieurs centaines de membres, chacun décide si cette vidéo vaut ses
 * données. Le lecteur n'existe qu'une fois ouvert.
 */
interface VideoBubbleProps {
  url?: string | null;
  thumbnail?: string | null;
  duration?: number | null;
  size?: number | null;
  /** Bulle pas encore confirmée par le serveur. */
  sending?: { status: "sending" | "failed"; progress?: number } | null;
  onLongPress?: () => void;
}

export function VideoBubble({ url, thumbnail, duration, size, sending = null, onLongPress }: VideoBubbleProps) {
  const [open, setOpen] = useState(false);
  const facts = [formatDuree(duration), size ? formatPoids(size) : ""].filter(Boolean).join(" · ");
  const etat = sending ? (sending.status === "failed" ? "Échec de l'envoi" : `Envoi ${sending.progress ?? 0} %`) : null;

  return (
    <>
      <Pressable
        onPress={() => url && setOpen(true)}
        onLongPress={onLongPress}
        disabled={!url}
        accessibilityRole="button"
        accessibilityLabel={`Lire la vidéo${facts ? `, ${facts}` : ""}`}
        style={styles.frame}
      >
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        ) : null}
        {url ? (
          <View style={styles.play}>
            <Play size={22} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.6} />
          </View>
        ) : null}
        {etat || facts ? (
          <View style={styles.facts}>
            <Text style={styles.factsText}>{etat ?? facts}</Text>
          </View>
        ) : null}
      </Pressable>

      {open && url ? <Lecteur url={url} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Lecteur({ url, onClose }: { url: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(url, (p) => p.play());
  const { status } = useEvent(player, "statusChange", { status: player.status });

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <View style={styles.player}>
        <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
        {status === "error" ? (
          <Text style={styles.playerError}>Cette vidéo ne peut pas être lue. Vérifiez votre connexion.</Text>
        ) : null}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer la vidéo"
          hitSlop={Space.md}
          style={[styles.close, { top: insets.top + Space.md }]}
        >
          <X size={22} color="#FFFFFF" strokeWidth={1.8} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 240,
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Violet[900],
    alignItems: "center",
    justifyContent: "center",
  },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  facts: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  factsText: { fontFamily: Font.medium, fontSize: 12, lineHeight: 16, color: "#FFFFFF" },
  player: { flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
  playerError: { ...Type.body, color: "#FFFFFF", textAlign: "center", paddingHorizontal: Space.xl },
  close: {
    position: "absolute",
    right: Space.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});
