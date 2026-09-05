/**
 * TabBar — la barre flottante.
 *
 * Arbitrage du §2 du plan d'implémentation, entre deux planches qui ne
 * disaient pas la même chose :
 *
 *   STRUCTURE, de « Accueil et Onglets » — quatre onglets, une action centrale,
 *   et le tiroir ouvert par un bouton d'en-tête (pas par l'avatar : il
 *   entrerait en collision avec les notifications). Le bouton central n'est pas
 *   un onglet mais un déclencheur de flux modal : contribuer n'est pas une
 *   destination, c'est une action.
 *
 *   FORME, de « Composants » — l'onglet actif porte la capsule violet-300 avec
 *   son icône et son libellé ; les inactifs sont des icônes seules. La planche
 *   Accueil avait perdu la capsule sans le justifier.
 *
 * Tenue en largeur (vérifiée au §2) : 390 − 40 de marges − 20 de marge interne
 * = 330 px utiles. Capsule active ≈ 126, action centrale 56, trois icônes de
 * 48 = 326. Ça tient — de justesse. Le libellé actif est donc borné à une
 * ligne et la capsule peut se comprimer : un libellé plus long rétrécit au
 * lieu de pousser la barre.
 *
 * ⚠ C'est LE SEUL flou du produit (brief §5 : « les Android d'entrée de gamme
 * s'écroulent au-delà »). Le fond blanc à 86 % tient seul si le flou ne rend
 * pas.
 *
 * Composant de présentation. Le câblage à `expo-router` est la phase C.
 */
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dot } from "@/components/ui/Badge";
import { GUTTER, Ink, Radius, Shadow, Space, UIType, Violet, passThrough } from "@/theme";

const BAR_HEIGHT = 64;
const CENTER_SIZE = 56;
const TAB_SIZE = 48;
/** Marge basse de la barre au-dessus de l'encoche. */
const BAR_INSET = 14;

/**
 * Ce qu'un écran doit réserver en bas de son contenu pour ne pas passer sous
 * la barre. À ajouter à `insets.bottom` :
 *
 *   contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
 */
export const TAB_BAR_SPACE = BAR_HEIGHT + BAR_INSET * 2;

export interface TabItem {
  key: string;
  label: string;
  /** Reçoit la couleur et la taille — l'onglet actif passe en violet-900. */
  icon: (props: { color: string; size: number }) => React.ReactNode;
  /** Pastille de non-lu, comme sur l'onglet Messages. */
  badge?: boolean;
  onPress: () => void;
}

export interface CenterAction {
  icon: (props: { color: string; size: number }) => React.ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
}

interface TabBarProps {
  items: TabItem[];
  activeKey: string;
  /** L'action centrale. Absente, la barre se referme sur ses seuls onglets. */
  center?: CenterAction;
  style?: StyleProp<ViewStyle>;
}

export function TabBar({ items, activeKey, center, style }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const half = Math.ceil(items.length / 2);

  return (
    <View
      style={[styles.wrapper, passThrough, { bottom: insets.bottom + BAR_INSET }, style]}
    >
      <BlurView intensity={24} tint="light" style={styles.bar}>
        {items.slice(0, half).map((item) => (
          <Tab key={item.key} item={item} active={item.key === activeKey} />
        ))}

        {center ? (
          <Pressable
            onPress={() => {
              tap();
              center.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={center.accessibilityLabel}
            style={({ pressed }) => [styles.center, pressed && styles.pressed]}
          >
            {center.icon({ color: Violet[900], size: 26 })}
          </Pressable>
        ) : null}

        {items.slice(half).map((item) => (
          <Tab key={item.key} item={item} active={item.key === activeKey} />
        ))}
      </BlurView>
    </View>
  );
}

function Tab({ item, active }: { item: TabItem; active: boolean }) {
  const color = active ? Violet[900] : Ink[300];

  return (
    <Pressable
      onPress={() => {
        tap();
        item.onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={({ pressed }) => [
        active ? styles.tabActive : styles.tab,
        pressed && styles.pressed,
      ]}
    >
      <View>
        {item.icon({ color, size: 22 })}
        {item.badge ? <Dot size={8} ringed style={styles.dot} /> : null}
      </View>
      {active ? (
        <Text style={styles.tabLabel} numberOfLines={1}>
          {item.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Retour haptique à la frappe. Remplace `components/haptic-tab.tsx`, qui
 * n'avait plus de raison d'être une fois la barre par défaut abandonnée.
 */
function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: GUTTER, right: GUTTER },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: Radius.chip,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.86)",
    boxShadow: Shadow.tabbar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  tab: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: Radius.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    height: TAB_SIZE,
    flexShrink: 1,
    paddingHorizontal: 18,
    borderRadius: Radius.chip,
    backgroundColor: Violet[300],
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  tabLabel: { ...UIType.chipLabel, color: Violet[900], flexShrink: 1 },
  center: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: Radius.chip,
    backgroundColor: Violet[300],
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.72 },
  dot: { position: "absolute", top: -2, right: -3 },
});
