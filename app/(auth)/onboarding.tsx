/**
 * app/(auth)/onboarding.tsx — la porte d'entrée.
 *
 * Refonte du §4 du plan, disposition alignée sur la référence Fundio fournie
 * par le commanditaire le 2026-09-04.
 *
 * LA DISPOSITION : un damier 2 × 2 où photos et tuiles alternent en diagonale
 * — photo en haut à gauche, tuile pastel en haut à droite, tuile en bas à
 * gauche, photo en bas à droite. La colonne de droite est décalée vers le bas :
 * c'est ce décalage qui donne l'air composé plutôt que gabarité. Puis, centrés :
 * une pastille, le titre, une phrase, et UNE action.
 *
 * La composition est ENTIÈREMENT STATIQUE — le cadre, le titre et le bouton ne
 * bougent pas. La sensation visée est la stabilité, la confiance. La vie vient
 * uniquement du CONTENU :
 *   — les deux cartes photo pivotent sur `rotateY` et révèlent d'autres scènes
 *     de la confrérie ;
 *   — les deux tuiles font défiler en boucle des pictogrammes de campagnes de
 *     dons, en sens opposés et à des vitesses premières entre elles (14 s et
 *     17 s) pour que la symétrie ne se voie jamais.
 *
 * **Règle : ne rien nommer, ne rien raconter. MONTRER.** Aucune incrustation
 * de texte sur les photographies.
 *
 * UNE SEULE ACTION. La planche portait « Passer » en haut et « Commencer » en
 * bas — deux boutons menant au même écran. La référence n'en a qu'un. À
 * arbitrage égal entre ajouter et retirer, on retire.
 *
 * ⚠ Les photographies sont les seules AUTHENTIQUES du fonds (§3.5). Les images
 * de banque ont été retirées : `ceremonie-*` montrait une procession orthodoxe
 * éthiopienne, `daara-2x1` une cour d'école d'Afrique de l'Est. Ne pas les
 * réintroduire.
 *
 * Les pictogrammes sont ceux fournis par le commanditaire le 2026-09-04,
 * retravaillés — bandeau d'attribution amputé, recadrage sur le tracé, teinte
 * Violet[900]. Recette et crédits : `assets/pictos/ATTRIBUTION.md`. Ils
 * remplacent les tracés Lucide qui tenaient la place.
 */
import { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/components/ui/Button";
import {
  Border,
  Font,
  GUTTER,
  Ink,
  Pastel,
  Radius,
  Space,
  Surface,
  Type,
  Violet,
  continuous,
} from "@/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Le contenu qui vit
// ─────────────────────────────────────────────────────────────────────────────

type Frame = { source: ImageSource; focus: number };

/**
 * Carte du haut : les visages. `focus` est l'ancrage vertical du cadrage, en
 * fraction de hauteur — les valeurs remontent vers les visages et amputent le
 * bas, où vit le filigrane du photographe.
 */
const ROLL_FACES: Frame[] = [
  { source: require("@/assets/photos/reel/sokhna-aida-2x3.jpg"), focus: 0.2 },
  { source: require("@/assets/photos/reel/guide-a-3x4.jpg"), focus: 0.26 },
  { source: require("@/assets/photos/reel/serigne-3x4.jpg"), focus: 0.24 },
  { source: require("@/assets/photos/reel/guide-c-3x4.jpg"), focus: 0.22 },
];

/**
 * Carte du bas : la communauté. Recadrages carrés DÉRIVÉS DES ORIGINAUX 3:2,
 * pas des 2:1 déjà produits — passer de 2:1 à 0,88 n'aurait gardé que 44 % de
 * la largeur. Les 2:1 restent au dépôt pour `CampaignCard`, qui est large.
 */
const ROLL_COMMUNITY: Frame[] = [
  { source: require("@/assets/photos/reel/scene-foule.jpg"), focus: 0.5 },
  { source: require("@/assets/photos/reel/scene-marmites.jpg"), focus: 0.5 },
  { source: require("@/assets/photos/reel/scene-plats.jpg"), focus: 0.5 },
];

/**
 * Les deux bandes ne défilent pas au hasard : chacune est un quatuor qui décrit
 * l'un des deux actes du produit, ceux que la pastille nomme.
 *
 * Un NDIGUEL, c'est un appel lancé, une caisse, une échéance, et des membres
 * jusqu'au bout du monde. Un JËF, c'est un repas servi, une main tendue, un
 * proche porté, la générosité.
 *
 * Quatre par bande et non trois : les tracés fournis sont plus fins que les
 * Lucide qu'ils remplacent, la bande respirait trop.
 */
const PICTOS_NDIGUEL: ImageSource[] = [
  require("@/assets/pictos/appel.png"),
  require("@/assets/pictos/collecte.png"),
  require("@/assets/pictos/echeance.png"),
  require("@/assets/pictos/diaspora.png"),
];

const PICTOS_JEF: ImageSource[] = [
  require("@/assets/pictos/repas.png"),
  require("@/assets/pictos/main-tendue.png"),
  require("@/assets/pictos/proche.png"),
  require("@/assets/pictos/generosite.png"),
];

// ─────────────────────────────────────────────────────────────────────────────
// Géométrie et rythmes
// ─────────────────────────────────────────────────────────────────────────────

/** Largeur / hauteur d'une carte photo, mesurée sur la référence. */
const PHOTO_RATIO = 0.88;
const CELL_GAP = 12;
/** Décalage de la colonne de droite — ce qui casse la symétrie du damier. */
const COLUMN_OFFSET = 14;
/** Part de la hauteur d'écran que le damier ne dépasse pas. */
const GRID_HEIGHT_SHARE = 0.48;

/** Durée d'un demi-pivot. L'image est échangée au point mort, à 90°. */
const FLIP_MS = 340;
const FLIP_EVERY_MS = 3600;
/** Décalage de la seconde carte : les deux ne tournent jamais ensemble. */
const FLIP_OFFSET_MS = 1800;

const PICTO_SIZE = 56;
const PICTO_GAP = Space.lg;
/**
 * Une période = une copie complète de la bande. Le défilement boucle dessus.
 *
 * Elle se calcule PAR BANDE. Une constante unique tirée de la longueur de la
 * première marchait tant que les deux bandes avaient le même nombre de
 * pictogrammes ; le jour où elles divergeaient, la seconde aurait sauté à
 * chaque tour. Le piège est levé, pas contourné.
 */
const marqueePeriod = (count: number) => count * (PICTO_SIZE + PICTO_GAP);

export default function Onboarding() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  /**
   * La cellule est bornée DEUX FOIS : par la largeur disponible, et par la part
   * de hauteur qu'on accorde au damier. Sans la seconde borne, un écran court
   * (un iPhone SE) verrait le bouton passer sous le pli.
   *
   * Hauteur d'une colonne = photo + écart + tuile carrée = c / R + g + c.
   */
  const byWidth = (width - GUTTER * 2 - CELL_GAP) / 2;
  const budget = height * GRID_HEIGHT_SHARE - COLUMN_OFFSET - CELL_GAP;
  const byHeight = budget / (1 / PHOTO_RATIO + 1);
  const cell = Math.floor(Math.min(byWidth, byHeight));
  const photoHeight = Math.round(cell / PHOTO_RATIO);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.grid}>
        <View style={styles.column}>
          <FlipCard
            roll={ROLL_FACES}
            direction={1}
            startDelay={0}
            accessibilityLabel="La guide et les figures de la confrérie"
            style={{ width: cell, height: photoHeight }}
          />
          <MarqueeTile
            pictos={PICTOS_JEF}
            tone={Pastel.teal}
            direction={1}
            durationMs={17000}
            size={cell}
            accessibilityLabel="Les Jëfs : un repas servi, une main tendue, un proche porté"
          />
        </View>

        <View style={[styles.column, styles.columnOffset]}>
          <MarqueeTile
            pictos={PICTOS_NDIGUEL}
            tone={Pastel.peach}
            direction={-1}
            durationMs={14000}
            size={cell}
            accessibilityLabel="Les Ndiguels : un appel, une collecte, une échéance"
          />
          <FlipCard
            roll={ROLL_COMMUNITY}
            direction={-1}
            startDelay={FLIP_OFFSET_MS}
            accessibilityLabel="Les rassemblements et les repas partagés du Daara"
            style={{ width: cell, height: photoHeight }}
          />
        </View>
      </View>

      {/*
        Le texte SUIT la grille, à distance fixe ; le bouton s'épingle en bas.
        L'inverse — tout le bloc poussé en bas par un ressort — creusait un vide
        entre la grille et le titre, visible sur la capture du 2026-09-04.
      */}
      <View style={styles.bottom}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Ndiguels et Jëfs</Text>
        </View>

        {/*
          Titre arrêté par le commanditaire le 2026-09-04. Il remplace « Le
          Daara dans votre poche ». La coupe est posée à la main : « Bienvenue
          sur Yessal Gui » tient sur deux lignes à 32/800, et laissée libre
          elle tomberait après « Yessal », séparant le nom du produit.
        */}
        <Text style={styles.title}>Bienvenue sur{"\n"}Yessal Gui</Text>
        <Text style={styles.subtitle}>
          {"Suivez les Ndiguels, faites vos Jëfs et portez vos proches, où que vous soyez."}
        </Text>
      </View>

      <View style={styles.spacer} />

      <Button label="Commencer" onPress={() => router.replace("/login")} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface FlipCardProps {
  roll: Frame[];
  /** Sens du pivot : 1 vers la droite, −1 vers la gauche. */
  direction: 1 | -1;
  startDelay: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * La carte photo qui pivote.
 *
 * Tout tient sur le fil natif : AUCUN état React, donc aucun rendu React
 * pendant l'animation. L'index de l'image est une valeur partagée, échangée
 * depuis le rappel de la première moitié du pivot — c'est-à-dire à 90°, quand
 * la carte est vue par la tranche et que l'échange est invisible.
 */
function FlipCard({
  roll,
  direction,
  startDelay,
  accessibilityLabel,
  style,
}: FlipCardProps) {
  const flip = useSharedValue(0);
  const index = useSharedValue(0);
  const count = roll.length;

  useEffect(() => {
    const turn = () => {
      flip.value = withSequence(
        withTiming(
          1,
          { duration: FLIP_MS, easing: Easing.in(Easing.cubic) },
          (finished) => {
            "worklet";
            if (finished) index.value = (index.value + 1) % count;
          },
        ),
        withTiming(0, { duration: FLIP_MS, easing: Easing.out(Easing.cubic) }),
      );
    };

    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(turn, FLIP_EVERY_MS);
    }, startDelay);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [count, flip, index, startDelay]);

  const card = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${flip.value * 90 * direction}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[styles.photoCard, card, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {roll.map((frame, i) => (
        <FlipFace key={i} frame={frame} position={i} index={index} />
      ))}
    </Animated.View>
  );
}

function FlipFace({
  frame,
  position,
  index,
}: {
  frame: Frame;
  position: number;
  index: { value: number };
}) {
  const face = useAnimatedStyle(() => ({
    opacity: index.value === position ? 1 : 0,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, face]}>
      <ExpoImage
        source={frame.source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ top: `${frame.focus * 100}%`, left: "50%" }}
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
}

interface MarqueeTileProps {
  pictos: ImageSource[];
  tone: string;
  /** −1 défile vers la gauche, 1 vers la droite. */
  direction: 1 | -1;
  durationMs: number;
  size: number;
  accessibilityLabel: string;
}

/**
 * La tuile pastel dont la bande de pictogrammes défile en boucle.
 *
 * La liste est doublée : la translation d'exactement une période revient donc
 * sur une bande identique, et la boucle ne se voit pas.
 */
function MarqueeTile({
  pictos,
  tone,
  direction,
  durationMs,
  size,
  accessibilityLabel,
}: MarqueeTileProps) {
  const period = marqueePeriod(pictos.length);
  const from = direction === -1 ? 0 : -period;
  const to = direction === -1 ? -period : 0;
  const x = useSharedValue(from);

  useEffect(() => {
    x.value = from;
    x.value = withRepeat(
      withTiming(to, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [durationMs, from, to, x]);

  const strip = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[styles.tile, { width: size, height: size, backgroundColor: tone }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.strip, strip]}>
        {/*
          Le tracé est DÉJÀ teinté en Violet[900] dans le fichier — pas de
          `tintColor` à l'exécution, dont le rendu diffère selon la plateforme.
          L'alpha est conservé, donc une teinte pourrait encore l'emporter si
          une tuile changeait de ton.
        */}
        {[...pictos, ...pictos].map((picto, i) => (
          <ExpoImage
            key={i}
            source={picto}
            style={styles.picto}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.default,
    paddingHorizontal: GUTTER,
    paddingBottom: GUTTER,
  },

  grid: {
    flexDirection: "row",
    justifyContent: "center",
    gap: CELL_GAP,
    paddingTop: Space.xl,
  },
  column: { gap: CELL_GAP },
  /** Le décalage qui casse la symétrie du damier. */
  columnOffset: { marginTop: COLUMN_OFFSET },

  photoCard: {
    borderRadius: Radius.card,
    ...continuous,
    overflow: "hidden",
    backgroundColor: Violet[100],
  },

  tile: {
    borderRadius: Radius.tile,
    ...continuous,
    overflow: "hidden",
    justifyContent: "center",
  },
  strip: { flexDirection: "row", alignItems: "center", paddingLeft: PICTO_GAP },
  picto: { width: PICTO_SIZE, height: PICTO_SIZE, marginRight: PICTO_GAP },

  spacer: { flex: 1, minHeight: Space.xxl },

  bottom: { alignItems: "center", marginTop: Space.huge },
  /**
   * La pastille de la référence : capsule contour, sur fond blanc. Décorative —
   * ce n'est pas un `Chip`, qui est une pilule de filtre avec une sémantique de
   * pression et une zone tactile de 44.
   */
  pill: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Border.strong,
  },
  pillLabel: { fontFamily: Font.bold, fontSize: 13, lineHeight: 16, color: Violet[900] },

  title: {
    ...Type.screenTitle,
    color: Violet[900],
    textAlign: "center",
    marginTop: Space.xl,
  },
  subtitle: {
    ...Type.body,
    color: Ink[500],
    textAlign: "center",
    marginTop: Space.md,
    maxWidth: 300,
  },
});
