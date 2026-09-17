/**
 * lib/html.ts — lecture du HTML d'un article, sans rien savoir de l'affichage.
 *
 * Séparé de <RichText> pour deux raisons. La première est qu'un analyseur est
 * du code pur : il prend une chaîne, rend un arbre, et se vérifie sans monter
 * un composant ni un simulateur. La seconde est que `toPlainText` sert
 * ailleurs que dans le rendeur — l'aperçu d'une carte d'Explore et le corps
 * d'un partage en ont besoin, et ni l'un ni l'autre n'affiche de texte riche.
 *
 * Le format couvert est celui de `core.richtext.ALLOWED_TAGS`, la liste
 * blanche que Django applique à l'enregistrement. Ces deux fichiers, plus la
 * barre d'outils de l'éditeur web, décrivent le même format et bougent
 * ensemble.
 */

export type HtmlNode =
  | { kind: "text"; text: string }
  | { kind: "el"; tag: string; href?: string; children: HtmlNode[] };

/** Balises sans fermeture. */
const VOID_TAGS = new Set(["br", "hr"]);

/** Balises qui ouvrent un bloc — tout le reste est du texte en ligne. */
export const BLOCK_TAGS = new Set([
  "p", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "hr",
]);

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", deg: "°", euro: "€",
};

/**
 * Bleach n'échappe que `& < > " '`. Les autres entités ne peuvent venir que
 * d'un auteur qui les a tapées à la main — elles sont traitées par confort,
 * pas par nécessité. Les accents français, eux, passent en UTF-8 direct.
 */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/* Les guillemets sont pris en compte dans la classe d'attributs pour qu'un `>`
   à l'intérieur d'une valeur — dans une URL, par exemple — ne termine pas la
   balise trop tôt. */
const TOKEN_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const HREF_RE = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;

/**
 * Remonte un arbre de nœuds.
 *
 * Une fermeture orpheline est ignorée, et une ouverture jamais refermée se
 * referme d'elle-même en fin de document : le HTML vient de `bleach`, qui
 * l'équilibre déjà, mais un article ne doit pas disparaître parce qu'une
 * balise a mal tourné en base.
 */
export function parseHtml(html: string): HtmlNode[] {
  const root: HtmlNode = { kind: "el", tag: "#root", children: [] };
  const stack: HtmlNode[] = [root];
  let cursor = 0;

  const push = (node: HtmlNode) => {
    const parent = stack[stack.length - 1];
    if (parent.kind === "el") parent.children.push(node);
  };

  const pushText = (raw: string) => {
    if (raw) push({ kind: "text", text: decodeEntities(raw) });
  };

  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(html)) !== null) {
    pushText(html.slice(cursor, match.index));
    cursor = TOKEN_RE.lastIndex;

    const tag = match[1].toLowerCase();

    if (match[0][1] === "/") {
      /* On ne dépile que si la balise est effectivement ouverte quelque part :
         sinon une `</div>` égarée fermerait le paragraphe courant. */
      const at = stack.findIndex((n) => n.kind === "el" && n.tag === tag);
      if (at > 0) stack.length = at;
      continue;
    }

    if (VOID_TAGS.has(tag)) {
      push({ kind: "el", tag, children: [] });
      continue;
    }

    const attrs = match[2] ?? "";
    const href = tag === "a" ? HREF_RE.exec(attrs) : null;
    const node: HtmlNode = {
      kind: "el",
      tag,
      href: href ? (href[2] ?? href[3] ?? href[4]) : undefined,
      children: [],
    };
    push(node);
    stack.push(node);
  }

  pushText(html.slice(cursor));
  return (root as { children: HtmlNode[] }).children;
}

/**
 * Les espaces d'un HTML sont insignifiants : l'éditeur produit des sauts de
 * ligne et des indentations entre les blocs, qui deviendraient des espaces
 * visibles dans un `<Text>`. On les replie, comme le fait un navigateur.
 */
export function collapse(text: string): string {
  return text.replace(/\s+/g, " ");
}

/** Un nœud ne porte-t-il que du blanc ? Ces nœuds-là ne valent pas un bloc. */
export function isBlank(node: HtmlNode): boolean {
  if (node.kind === "text") return node.text.trim() === "";
  if (node.tag === "hr" || node.tag === "br") return false;
  return node.children.every(isBlank);
}

/**
 * Regroupe en blocs, en insérant les paragraphes implicites.
 *
 * Le texte et les balises en ligne posés directement à la racine — ce que
 * produit un article commencé sans paragraphe — deviennent un `<p>`, comme le
 * fait un navigateur. Sans cela, chaque fragment deviendrait sa propre ligne.
 */
export function toBlocks(nodes: HtmlNode[]): HtmlNode[] {
  const out: HtmlNode[] = [];
  let loose: HtmlNode[] = [];

  const flush = () => {
    if (loose.length > 0 && !loose.every(isBlank)) {
      out.push({ kind: "el", tag: "p", children: loose });
    }
    loose = [];
  };

  for (const node of nodes) {
    if (node.kind === "el" && BLOCK_TAGS.has(node.tag)) {
      flush();
      if (!isBlank(node)) out.push(node);
    } else {
      loose.push(node);
    }
  }
  flush();
  return out;
}

/**
 * Un contenu vient-il de l'éditeur riche, ou de l'ancien champ texte ?
 *
 * Pendant de `core.richtext.looks_like_html` et de `isHtmlContent` côté web.
 * Les trois doivent répondre pareil : c'est ce test qui décide si le corps est
 * analysé comme du balisage ou affiché tel quel.
 */
export function isHtmlContent(value?: string | null): boolean {
  return Boolean(value) && /<[a-zA-Z/!][^>]*>/.test(value as string);
}

/**
 * Réduit un contenu à son texte — pour un aperçu de carte, un partage ou une
 * notification, où le balisage n'a rien à faire.
 */
export function toPlainText(value?: string | null): string {
  if (!value) return "";
  if (!isHtmlContent(value)) return value;
  return decodeEntities(
    value
      /* Les fins de bloc valent une séparation : sans elles, « …Touba</p><p>La
         délégation… » donnerait « ToubaLa délégation ». */
      .replace(/<\/(p|h2|h3|h4|li|blockquote|pre)>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}
