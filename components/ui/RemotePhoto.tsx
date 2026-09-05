/**
 * RemotePhoto — une photographie du serveur, qui dit quand elle manque.
 *
 * ── Pourquoi ce composant existe ────────────────────────────────────────────
 *
 * Les captures du 2026-09-05 ont montré la galerie d'un article rendue en
 * **deux carrés gris anonymes**. Diagnostic : les trois lignes de
 * `NewsGalleryImage` en base pointent vers des fichiers absents du disque —
 * téléversés avant que le volume Docker `media_data` n'existe, donc détruits
 * avec la couche du conteneur. `manage.py check_media` en compte six au total,
 * pièces d'identité comprises.
 *
 * Le défaut de code n'est pas la donnée manquante : c'est que
 * `<ExpoImage source={{ uri }} />` sur une URL qui répond 404 rend **un
 * rectangle de la couleur du fond, sans un mot**. Un lecteur ne peut pas
 * distinguer « la photo charge encore », « il n'y a pas de photo » et « la
 * photo est perdue ». C'est le même mensonge muet que les états vides que les
 * phases D à F ont passé leur temps à retirer.
 *
 * Ici, une image absente porte un pictogramme et un libellé pour le lecteur
 * d'écran. Elle ne se fait pas passer pour un cadre vide.
 *
 * ⚠ Ce composant **ne répare pas la donnée**. Les six références mortes se
 * vident avec `python manage.py check_media --clean`, ou se remplacent en
 * reversant les fichiers. C'est une décision du commanditaire, pas la mienne.
 */
import { useState } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image as ExpoImage, type ImageContentFit } from "expo-image";
import { ImageOff } from "lucide-react-native";

import { Ink, Surface } from "@/theme";

interface RemotePhotoProps {
  /** `null` : le champ est vide côté serveur. Même rendu qu'un échec. */
  uri?: string | null;
  /** Décrit ce que la photographie montre, pour le lecteur d'écran. */
  accessibilityLabel: string;
  contentFit?: ImageContentFit;
  /** Taille du pictogramme de repli. À l'échelle du cadre. */
  fallbackIconSize?: number;
  /** Le cadre : dimensions, rayon, fond. Porté par l'enveloppe. */
  style?: StyleProp<ViewStyle>;
}

export function RemotePhoto({
  uri,
  accessibilityLabel,
  contentFit = "cover",
  fallbackIconSize = 22,
  style,
}: RemotePhotoProps) {
  /**
   * L'échec est un état local, pas une prop : deux vignettes voisines peuvent
   * échouer indépendamment, et une nouvelle `uri` doit pouvoir réessayer —
   * d'où la remise à zéro par la clé plutôt qu'un effet.
   */
  const [failed, setFailed] = useState(false);
  const missing = !uri || failed;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={missing ? `${accessibilityLabel} — image indisponible` : accessibilityLabel}
      style={[styles.frame, style]}
    >
      {missing ? (
        <View style={styles.fallback}>
          <ImageOff size={fallbackIconSize} color={Ink[300]} strokeWidth={1.5} />
        </View>
      ) : (
        <ExpoImage
          key={uri}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={200}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", backgroundColor: Surface.alt },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
