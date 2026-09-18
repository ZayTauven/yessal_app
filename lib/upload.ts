import { File } from "expo-file-system";

import { ErreurLisible } from "./api";

/**
 * Le SEUL endroit qui sait fabriquer une pièce de fichier pour un `FormData`.
 *
 * ── 🔴 CE QUI CASSAIT TOUS LES TÉLÉVERSEMENTS ───────────────────────────────
 *
 * On écrivait, comme React Native l'a toujours permis :
 *
 *     form.append("avatar", { uri, name, type } as unknown as Blob);
 *
 * Depuis Expo SDK 56, le `fetch` global n'est plus celui de React Native mais
 * celui d'Expo, et celui-là REFUSE cet objet à trois clés :
 *
 *     node_modules/expo/src/winter/fetch/convertFormData.ts
 *       ligne 35 : « `uri` is not supported for React Native's FormData »
 *       ligne 77 : throw new Error('Unsupported FormDataPart implementation')
 *
 * Le piège tient à l'endroit d'où part cette exception. Le corps est construit
 * AVANT le `try` qui entoure l'appel natif (`winter/fetch/fetch.ts`, ligne 65
 * contre lignes 82-90) : la requête ne quitte jamais le téléphone, et l'erreur
 * remonte en `Error` nu — pas en `FetchError`. Elle ne ressemblait donc à rien
 * de connu, et l'écran la prenait pour une coupure réseau. Le membre lisait
 * « Vérifiez votre connexion » avec quatre barres de réseau, recommençait, et
 * retombait dessus. Le serveur, lui, avale sans broncher un envoi de 3 Mo.
 *
 * ── CE QU'ON FAIT À LA PLACE ────────────────────────────────────────────────
 *
 * Un `File` d'`expo-file-system` : il porte `name`, `type` et surtout `bytes()`,
 * les trois choses que le fetch d'Expo sait lire (`convertFormData.ts`, ligne
 * 73). C'est la forme standard, pas une dérogation — elle survivra au SDK 57,
 * ce que le drapeau de secours `EXPO_PUBLIC_USE_RN_FETCH` n'aurait pas garanti.
 *
 * ⚠ Ne JAMAIS revenir à `{ uri, name, type }` ici, même si un exemple trouvé en
 * ligne le montre : la quasi-totalité des exemples de téléversement React Native
 * datent d'avant ce changement.
 */
export function fichierPourEnvoi(uri: string): File {
  let fichier: File;
  try {
    fichier = new File(uri);
  } catch (cause) {
    /* URI qu'`expo-file-system` ne sait pas ouvrir — un `content://` d'une
       application tierce, par exemple. Inutile de parler de réseau. */
    throw new ErreurLisible(
      "Cette image n'a pas pu être lue. Reprenez-la ou choisissez-en une autre.",
      { cause },
    );
  }

  /*
    Le fichier de la galerie peut avoir disparu entre le choix et l'envoi — la
    photo est supprimée, la carte SD retirée, ou le cache de l'appareil photo
    vidé par Android sous la pression mémoire. On le dit AVANT de partir, plutôt
    que de laisser `bytes()` échouer plus loin avec un message technique.
  */
  if (!fichier.exists) {
    throw new ErreurLisible(
      "Cette image n'est plus disponible sur le téléphone. Reprenez-la.",
    );
  }

  return fichier;
}
