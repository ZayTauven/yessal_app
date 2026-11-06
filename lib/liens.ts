/**
 * Les liens d'un message : les trouver, les raccourcir, reconnaître YouTube.
 * Même logique que `format.ts` côté web.
 */

const LIEN = /https?:\/\/[^\s]+/g;

/** La ponctuation qui suit un lien appartient à la phrase, pas à l'adresse. */
function sansPonctuationFinale(lien: string): string {
  return lien.replace(/[.,;:!?)\]»"']+$/, "");
}

export type Morceau = { type: "texte" | "lien" | "mention"; valeur: string };

export function decouper(texte: string): Morceau[] {
  const morceaux: Morceau[] = [];
  const motif = /(https?:\/\/[^\s]+)|(@[\p{L}][\p{L}'-]*)/gu;
  let reste = 0;
  for (const trouve of texte.matchAll(motif)) {
    const debut = trouve.index ?? 0;
    const valeur = trouve[1] ? sansPonctuationFinale(trouve[1]) : trouve[0];
    if (debut > reste) morceaux.push({ type: "texte", valeur: texte.slice(reste, debut) });
    morceaux.push({ type: trouve[1] ? "lien" : "mention", valeur });
    reste = debut + valeur.length;
  }
  if (reste < texte.length) morceaux.push({ type: "texte", valeur: texte.slice(reste) });
  return morceaux;
}

/** « https://www.exemple.com/une/longue/page?x=1 » → « exemple.com/une/longue/pa… ». */
export function libelleLien(lien: string): string {
  const sansProtocole = lien.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return sansProtocole.length > 34 ? `${sansProtocole.slice(0, 33)}…` : sansProtocole;
}

/** L'identifiant d'une vidéo YouTube, quelle que soit la forme du lien. */
export function idYoutube(lien: string): string | null {
  const trouve =
    /^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/)([\w-]{11})(?![\w-])/i.exec(lien) ??
    /^https?:\/\/youtu\.be\/([\w-]{11})(?![\w-])/i.exec(lien);
  return trouve ? trouve[1] : null;
}

/**
 * Sépare les vidéos YouTube du reste du message : elles s'affichent en carte, et
 * leur adresse n'a plus besoin de figurer dans le texte.
 */
export function extraireYoutube(texte: string): { reste: string; videos: { id: string; url: string }[] } {
  const videos: { id: string; url: string }[] = [];
  const reste = texte
    .replace(LIEN, (brut) => {
      const url = sansPonctuationFinale(brut);
      const id = idYoutube(url);
      if (!id) return brut;
      if (!videos.some((v) => v.id === id)) videos.push({ id, url });
      return brut.slice(url.length);
    })
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return { reste, videos };
}
