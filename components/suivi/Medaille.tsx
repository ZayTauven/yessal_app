/**
 * La médaille et la couronne de laurier des trois premiers du podium des
 * donateurs (Suivi du Kourel, 2026-11-01).
 *
 * Même dessin que `front-web/src/components/vireo/Medaille.tsx` : même
 * géométrie, mêmes teintes. Tout est en SVG — net à toutes les tailles, sans
 * image à embarquer. `react-native-svg` est déjà dans l'app (lucide en dépend) :
 * aucun module natif de plus.
 */
import { useId, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { Font } from "@/theme";

export type Metal = "or" | "argent" | "bronze";

export const TEINTES: Record<Metal, { clair: string; fonce: string; texte: string; nom: string }> = {
  or: { clair: "#FBE08A", fonce: "#C08A1E", texte: "#4A3207", nom: "Or" },
  argent: { clair: "#F1F3F6", fonce: "#9AA1AC", texte: "#2E3440", nom: "Argent" },
  bronze: { clair: "#F2B98A", fonce: "#9A5527", texte: "#3B1F0C", nom: "Bronze" },
};

/** Le métal d'un rang : or, argent, bronze pour les trois premiers. */
export function metalDuRang(rang: number): Metal | null {
  return rang === 1 ? "or" : rang === 2 ? "argent" : rang === 3 ? "bronze" : null;
}

/** `useId` rend « «r1» » ou « :r1: » : illisible dans un `url(#…)` de SVG. */
function useSvgId() {
  return `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

/** Une pastille de médaille portant le rang. */
export function Medaille({ metal, rang }: { metal: Metal; rang: number }) {
  const id = useSvgId();
  const t = TEINTES[metal];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${t.nom}, rang ${rang}`}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.clair} />
            <Stop offset="1" stopColor={t.fonce} />
          </LinearGradient>
        </Defs>
        <Circle cx={13} cy={13} r={12} fill={`url(#${id})`} />
        <Circle cx={13} cy={13} r={9.2} fill="none" stroke={t.clair} strokeOpacity={0.85} strokeWidth={1} />
        {/* `alignmentBaseline` plutôt que `dominantBaseline` : Android ignore le second. */}
        <SvgText
          x={13}
          y={13}
          textAnchor="middle"
          alignmentBaseline="central"
          fontSize={11}
          fontFamily={Font.bold}
          fill={t.texte}
        >
          {String(rang)}
        </SvgText>
      </Svg>
    </View>
  );
}

/* Une feuille de laurier, pointue aux deux bouts, de hauteur 2 (−1 à 1). */
const FEUILLE = "M0,-1 C0.5,-0.45 0.5,0.45 0,1 C-0.5,0.45 -0.5,-0.45 0,-1Z";

/** Un point du cercle de la couronne, angle en degrés (sens trigonométrique). */
function point(deg: number, rayon: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [50 + rayon * Math.cos(rad), 50 - rayon * Math.sin(rad)];
}

const R = 40;

/*
 * Branche gauche, du bas (252°) vers le haut (138°) — la droite en miroir.
 * Chaque nœud de la tige porte une paire de feuilles, l'une penchée vers
 * l'extérieur, l'autre vers l'intérieur, de plus en plus petites vers la
 * pointe. Calculées une fois : elles ne dépendent ni du métal ni de la taille.
 */
const FEUILLES = Array.from({ length: 7 }, (_, i) => {
  const deg = 252 - i * 19;
  const longueur = 8 * (1 - i * 0.06);
  return (
    [
      [1.9, 38],
      [-1.9, -38],
    ] as const
  ).map(([decalage, penche]) => {
    const [x, y] = point(deg, R + decalage);
    return { x, y, angle: -deg - 90 + penche, longueur };
  });
}).flat();

const [X0, Y0] = point(258, R);
const [X1, Y1] = point(132, R);

/** Deux branches de laurier qui encerclent `children` (une photo), ouvertes en haut et nouées en bas. */
export function CouronneLaurier({
  metal,
  taille = 52,
  children,
}: {
  metal: Metal;
  taille?: number;
  children: ReactNode;
}) {
  const id = useSvgId();
  const t = TEINTES[metal];
  return (
    <View style={[styles.couronne, { width: taille, height: taille }]}>
      <Svg width={taille} height={taille} viewBox="0 0 100 100" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.clair} />
            <Stop offset="1" stopColor={t.fonce} />
          </LinearGradient>
        </Defs>
        {[1, -1].map((sens) => (
          <G key={sens} transform={sens === -1 ? "translate(100 0) scale(-1 1)" : undefined}>
            <Path
              d={`M ${X0} ${Y0} A ${R} ${R} 0 0 1 ${X1} ${Y1}`}
              fill="none"
              stroke={t.fonce}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            {FEUILLES.map((f, i) => (
              <Path
                key={i}
                d={FEUILLE}
                fill={`url(#${id})`}
                stroke={t.fonce}
                strokeOpacity={0.5}
                strokeWidth={0.6 / f.longueur}
                transform={`translate(${f.x} ${f.y}) rotate(${f.angle}) scale(${f.longueur * 0.62} ${f.longueur})`}
              />
            ))}
          </G>
        ))}
        {/* Le nœud */}
        <Circle cx={50} cy={50 + R + 2} r={2.6} fill={t.fonce} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  couronne: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
