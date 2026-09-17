/**
 * RichText — le corps d'un article, tel que l'éditeur du tableau de bord l'écrit.
 *
 * Depuis que les actualités se rédigent avec <RichTextEditor>, `content` n'est
 * plus du texte : c'est du HTML. Rendu dans le `<Text>` qui l'affichait jusque
 * là, un article mis en forme apparaîtrait balises comprises — « <p>Le
 * <strong>Magal</strong>… ».
 *
 * Et c'est ici que ça compte le plus : la plupart des membres lisent la
 * confrérie sur leur téléphone. Une mise en forme qui ne servirait qu'à
 * l'administrateur qui la saisit n'aurait aucun intérêt.
 *
 * ── Pourquoi pas une bibliothèque ─────────────────────────────────────────
 * `react-native-render-html` est à l'arrêt depuis deux ans et ne déclare pas
 * React 19. Les autres passent par une WebView : pour treize balises, c'est un
 * moteur de rendu entier chargé au milieu d'un ScrollView, avec son coût de
 * démarrage et sa gestion de hauteur.
 *
 * ── Le partage des rôles ──────────────────────────────────────────────────
 * Ce fichier ne lit pas le HTML : `lib/html.ts` le fait, et se vérifie seul.
 * Ici, uniquement la mise en forme — quel cran typographique pour un `<h2>`,
 * quelle couleur pour un lien.
 *
 * Le format couvert est celui de `core.richtext.ALLOWED_TAGS`. Ce qui n'est pas
 * reconnu est ignoré comme BALISE mais son texte est conservé : un article ne
 * perd jamais ses mots, au pire sa mise en forme.
 *
 * ── Sécurité ──────────────────────────────────────────────────────────────
 * Aucune précaution n'est prise ici, et il n'en faut pas : rien n'exécute quoi
 * que ce soit — pas de WebView, pas d'évaluation. Une balise `<script>` qui
 * aurait traversé l'assainisseur ne serait ici qu'un nom de balise inconnu,
 * donc du texte.
 */

import { memo, useMemo, type ReactNode } from "react";
import { Linking, StyleSheet, Text, View, type TextStyle } from "react-native";
import { Font, Ink, Radius, Space, Surface, Type, Violet, continuous } from "@/theme";
import {
  collapse,
  isHtmlContent,
  parseHtml,
  toBlocks,
  type HtmlNode,
} from "@/lib/html";

/* Réexportés pour que l'écran d'article n'ait qu'une porte d'entrée. */
export { isHtmlContent, toPlainText } from "@/lib/html";

/*
 * Aucun style n'est transporté dans la descente : un `<Text>` imbriqué hérite
 * de son parent en React Native. Un `<strong>` dans un `<em>` n'a donc qu'à
 * poser sa graisse — la pente est déjà là.
 */
function renderInline(nodes: HtmlNode[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];

  nodes.forEach((node, i) => {
    const key = `${keyPrefix}.${i}`;

    if (node.kind === "text") {
      out.push(collapse(node.text));
      return;
    }

    const inner = () => renderInline(node.children, key);

    switch (node.tag) {
      case "br":
        out.push("\n");
        return;

      case "strong":
      case "b":
        out.push(<Text key={key} style={styles.bold}>{inner()}</Text>);
        return;

      case "em":
      case "i":
        /* Plus Jakarta Sans n'est chargée qu'en romain — les cinq graisses
           déclarées dans `_layout` n'incluent aucun italique. Le système
           synthétise donc la pente, ce qu'il fait proprement. */
        out.push(<Text key={key} style={styles.italic}>{inner()}</Text>);
        return;

      case "u":
        out.push(<Text key={key} style={styles.underline}>{inner()}</Text>);
        return;

      case "s":
      case "strike":
        out.push(<Text key={key} style={styles.strike}>{inner()}</Text>);
        return;

      case "code":
        out.push(<Text key={key} style={styles.code}>{inner()}</Text>);
        return;

      case "a": {
        const { href } = node;
        out.push(
          <Text
            key={key}
            style={styles.link}
            accessibilityRole="link"
            /* `canOpenURL` n'est pas consulté : il exige une déclaration dans
               `LSApplicationQueriesSchemes` sur iOS et renvoie faux sans elle,
               alors qu'`openURL` fonctionne. On tente, et on se tait si le
               téléphone n'a rien pour ouvrir. */
            onPress={href ? () => void Linking.openURL(href).catch(() => {}) : undefined}
          >
            {inner()}
          </Text>,
        );
        return;
      }

      default:
        /* Balise inconnue : on garde son contenu. Voir l'en-tête — un article
           ne perd jamais ses mots. */
        out.push(...inner());
    }
  });

  return out;
}

function Block({ node, index, tone }: { node: HtmlNode; index: number; tone: TextStyle }) {
  const key = `b${index}`;

  if (node.kind === "text") {
    const text = collapse(node.text);
    return text.trim() ? <Text style={[styles.p, tone]}>{text}</Text> : null;
  }

  switch (node.tag) {
    case "h2":
      return <Text style={[styles.h2, tone]}>{renderInline(node.children, key)}</Text>;
    case "h3":
      return <Text style={[styles.h3, tone]}>{renderInline(node.children, key)}</Text>;
    case "h4":
      return <Text style={[styles.h4, tone]}>{renderInline(node.children, key)}</Text>;

    case "hr":
      return <View style={styles.hr} />;

    case "blockquote":
      return (
        <View style={styles.quote}>
          {/* Une citation peut contenir plusieurs paragraphes : on la traite en
              conteneur de BLOCS, pas en ligne de texte. */}
          <Blocks nodes={node.children} tone={styles.quoteTone} />
        </View>
      );

    case "pre":
      return (
        <View style={styles.pre}>
          <Text style={styles.preText}>{renderInline(node.children, key)}</Text>
        </View>
      );

    case "ul":
    case "ol": {
      const items = node.children.filter((c) => c.kind === "el" && c.tag === "li");
      return (
        <View style={styles.list}>
          {items.map((item, i) => (
            <View key={`${key}.${i}`} style={styles.listRow}>
              {/* La puce est un `<Text>` de largeur fixe et non un
                  `listStyleType` : React Native n'en a pas. La largeur fixe
                  aligne la deuxième ligne d'un élément sous la première, au
                  lieu de la ramener sous la puce. */}
              <Text style={styles.bullet}>{node.tag === "ol" ? `${i + 1}.` : "•"}</Text>
              <Text style={[styles.listText, tone]}>
                {renderInline((item as { children: HtmlNode[] }).children, `${key}.${i}`)}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    case "p":
    default:
      return <Text style={[styles.p, tone]}>{renderInline(node.children, key)}</Text>;
  }
}

function Blocks({ nodes, tone }: { nodes: HtmlNode[]; tone?: TextStyle }) {
  const blocks = useMemo(() => toBlocks(nodes), [nodes]);
  const applied = tone ?? styles.bodyTone;

  return (
    <>
      {blocks.map((node, i) => (
        <Block key={i} node={node} index={i} tone={applied} />
      ))}
    </>
  );
}

export interface RichTextProps {
  /** HTML assaini par Django, ou texte brut d'un article d'avant l'éditeur. */
  content?: string | null;
}

export const RichText = memo(function RichText({ content }: RichTextProps) {
  const nodes = useMemo(
    () => (content && isHtmlContent(content) ? parseHtml(content) : null),
    [content],
  );

  if (!content) return null;

  /* Article d'avant l'éditeur : du texte, dont les retours à la ligne portent
     toute la structure. C'est exactement ce que l'écran faisait avant, et ce
     qu'il doit continuer de faire pour eux. */
  if (!nodes) return <Text style={[styles.p, styles.bodyTone]}>{content}</Text>;

  return (
    <View style={styles.root}>
      <Blocks nodes={nodes} />
    </View>
  );
});

const bodyText: TextStyle = { ...Type.body, fontSize: 15, lineHeight: 24 };

const styles = StyleSheet.create({
  root: { gap: Space.md },

  bodyTone: { color: Ink[900] },
  quoteTone: { color: Violet[900] },

  p: bodyText,

  h2: { fontFamily: Font.extrabold, fontSize: 20, lineHeight: 26, marginTop: Space.sm },
  h3: { fontFamily: Font.bold, fontSize: 17, lineHeight: 23, marginTop: Space.xs },
  h4: { fontFamily: Font.semibold, fontSize: 15, lineHeight: 21 },

  bold: { fontFamily: Font.bold },
  italic: { fontStyle: "italic" },
  underline: { textDecorationLine: "underline" },
  strike: { textDecorationLine: "line-through" },

  /* Même traitement que l'encadré de résumé de l'écran d'article : filet
     violet à gauche, fond alterné. Une citation doit se lire comme telle sans
     qu'on ait à deviner. */
  quote: {
    backgroundColor: Surface.alt,
    borderLeftWidth: 3,
    borderLeftColor: Violet[300],
    borderRadius: Radius.input,
    ...continuous,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    gap: Space.sm,
  },

  list: { gap: Space.xs },
  listRow: { flexDirection: "row", gap: Space.sm },
  bullet: { ...bodyText, color: Violet[700], minWidth: 18 },
  listText: { ...bodyText, flex: 1 },

  /* Violet 500 est le cran « liens » du système — 5,2:1 sur blanc. */
  link: { color: Violet[500], textDecorationLine: "underline" },

  code: { fontFamily: Font.medium, backgroundColor: Surface.alt, fontSize: 14 },
  pre: {
    backgroundColor: Surface.alt,
    borderRadius: Radius.input,
    ...continuous,
    padding: Space.md,
  },
  preText: { fontFamily: Font.regular, fontSize: 13, lineHeight: 20, color: Ink[900] },

  hr: { height: 1, backgroundColor: Ink[100], marginVertical: Space.sm },
});

export default RichText;
