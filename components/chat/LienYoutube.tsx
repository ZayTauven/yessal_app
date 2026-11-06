import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Play } from "lucide-react-native";

import { Font, Ink, Space, Surface } from "@/theme";

type Infos = { title?: string; author_name?: string };

/* Le titre et la chaîne, gardés le temps de la session : une liste démonte et
   remonte ses lignes en défilant, et YouTube n'a pas à être rappelé. */
const cache = new Map<string, Promise<Infos | null>>();

function infosDe(id: string): Promise<Infos | null> {
  let promesse = cache.get(id);
  if (!promesse) {
    const adresse = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
    promesse = fetch(`https://www.youtube.com/oembed?format=json&url=${adresse}`)
      .then((res) => (res.ok ? (res.json() as Promise<Infos>) : null))
      .catch(() => null);
    cache.set(id, promesse);
  }
  return promesse;
}

/**
 * Un lien YouTube, en carte. La miniature pèse une quinzaine de Ko et rien ne se
 * lit ici : l'appui ouvre l'application YouTube, ou le navigateur. Une vidéo
 * privée ou supprimée garde sa carte, simplement sans titre.
 */
export function LienYoutube({ id, url, onLongPress }: { id: string; url: string; onLongPress?: () => void }) {
  const [infos, setInfos] = useState<Infos | null>(null);

  useEffect(() => {
    let actif = true;
    infosDe(id).then((resultat) => {
      if (actif) setInfos(resultat);
    });
    return () => {
      actif = false;
    };
  }, [id]);

  const titre = infos?.title || "Vidéo YouTube";

  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      onLongPress={onLongPress}
      delayLongPress={280}
      accessibilityRole="link"
      accessibilityLabel={`Ouvrir sur YouTube : ${titre}`}
      style={styles.card}
    >
      <View style={styles.visual}>
        <Image source={{ uri: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        <View style={styles.play}>
          <Play size={20} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.6} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {titre}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {infos?.author_name ? `YouTube · ${infos.author_name}` : "YouTube"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 240, borderRadius: 14, overflow: "hidden", backgroundColor: Surface.default },
  visual: { height: 135, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  body: { padding: Space.md, gap: 2 },
  title: { fontFamily: Font.semibold, fontSize: 14, lineHeight: 18, color: Ink[900] },
  meta: { fontFamily: Font.medium, fontSize: 12, lineHeight: 16, color: Ink[500] },
});
