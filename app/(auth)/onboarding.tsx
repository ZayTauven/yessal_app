import { useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Colors } from "@/constants/colors";

const { width: W } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    image: require("@/assets/images/onboarding-1.jpg"),
    title: "Bienvenue sur\nYessal Gui",
    subtitle:
      "La plateforme numérique de votre confrérie. Gérez les dons, suivez les événements et restez connecté à votre Daara.",
  },
  {
    id: "2",
    image: require("@/assets/images/onboarding-2.jpg"),
    title: "Donnez en\nquelques secondes",
    subtitle:
      "Contribuez aux campagnes de votre Daara via Orange Money, Wave ou PayPal. Faites aussi des dons au nom de vos proches.",
  },
  {
    id: "3",
    image: require("@/assets/images/onboarding-3.jpg"),
    title: "Votre Daara,\noù que vous soyez",
    subtitle:
      "Suivez les événements, échangez avec votre communauté et consultez l'historique de vos contributions depuis n'importe où.",
  },
];

function Dot({ active }: { active: boolean }) {
  return (
    <View
      style={{
        width: active ? 22 : 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: active ? Colors.accent.DEFAULT : Colors.ink.ghost,
        marginHorizontal: 4,
      }}
    />
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1 });
      setCurrent(current + 1);
    } else {
      router.replace("/login" as any);
    }
  };

  const handleSkip = () => router.replace("/login" as any);

  const isLast = current === SLIDES.length - 1;

  const onMomentumScrollEnd = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setCurrent(roundIndex);
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgBase} />
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          {!isLast && (
            <Pressable
              onPress={handleSkip}
              hitSlop={15}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>Passer</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          ref={flatRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: W }]}>
              <View style={styles.illustrationWrap}>
                <ExpoImage
                  source={item.image}
                  style={styles.image}
                  contentFit="cover"
                  transition={500}
                />
                <View style={styles.imageOverlay} />
              </View>

              <View style={styles.textWrap}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          )}
        />

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <Dot key={i} active={i === current} />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.cta,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={styles.ctaOnboarding}>
              {isLast ? "Commencer" : "Suivant"}
            </Text>
          </Pressable>

          {!isLast && (
            <Pressable
              onPress={() => router.replace("/login" as any)}
              style={{ marginTop: 20 }}
            >
              <Text style={styles.already}>
                Déjà membre ?{" "}
                <Text style={styles.alreadyLink}>Se connecter</Text>
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FDFBF8",
  },
  bgBlobTop: {
    position: "absolute",
    top: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.accent.dim,
    opacity: 0.7,
  },
  bgBlobBottom: {
    position: "absolute",
    right: -120,
    bottom: 120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(184, 134, 11, 0.12)",
    opacity: 0.9,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 10,
    height: 60,
    zIndex: 10,
  },
  skipButton: {
    backgroundColor: Colors.accent.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: Colors.accent.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  skipText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  slide: {
    flex: 1,
    alignItems: "center",
  },
  illustrationWrap: {
    width: W * 0.88,
    height: W * 0.9,
    borderRadius: 32,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 35,
    backgroundColor: Colors.surface.muted,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  image: {
    flex: 1,
    width: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 92, 58, 0.03)",
  },
  textWrap: {
    paddingHorizontal: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.ink.muted,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 310,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
    width: "100%",
  },
  dots: {
    flexDirection: "row",
    marginBottom: 32,
    alignItems: "center",
  },
  cta: {
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: 18,
    paddingVertical: 18,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  ctaOnboarding: {
    color: "green",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  already: {
    fontSize: 15,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
  },
  alreadyLink: {
    color: Colors.accent.DEFAULT,
    fontFamily: "Inter_700Bold",
  },
});
