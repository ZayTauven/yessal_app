import { Storage } from "./storage";

import { Config } from "@/constants/configs";

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

type ApiOptions = {
  auth?: boolean;
  retryOn401?: boolean;
  headers?: HeadersInit;
};

type RequestInitWithJson = Omit<RequestInit, "body"> & {
  body?: unknown;
};

let refreshPromise: Promise<string | null> | null = null;

const baseUrl = Config.API_URL.replace(/\/+$/, "");

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}

function toHeaders(headers?: HeadersInit, hasJsonBody = true) {
  const next = new Headers(headers);
  if (hasJsonBody) {
    next.set("Content-Type", "application/json");
  }
  return next;
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function extractErrorMessage(payload: any, fallback: string) {
  return (
    payload?.detail ||
    payload?.message ||
    payload?.non_field_errors?.[0] ||
    payload?.error ||
    fallback
  );
}

/**
 * Ce qu'on montre à l'utilisateur quand une écriture échoue.
 *
 * ── 🔴 « Vérifiez votre connexion internet » était affiché À TORT ───────────
 *
 * Les écrans de téléversement rattrapaient `catch { … }` sans regarder ce
 * qu'ils rattrapaient, et affichaient tous la même phrase. Un 500 du serveur,
 * une pièce en double, un fichier refusé : trois causes, un seul conseil — et
 * ce conseil était FAUX. Le membre voyait « vérifiez votre connexion » avec
 * quatre barres de réseau, recommençait à l'identique, et retombait dessus.
 *
 * La distinction qui manquait tient en une ligne : **si c'est une `ApiError`,
 * le serveur a répondu**. Le réseau a donc fonctionné, et parler de connexion
 * n'a aucun sens. Une vraie coupure fait lever `fetch` lui-même — un
 * `TypeError: Network request failed`, qui n'est pas une `ApiError` : c'est le
 * seul cas où le repli sur la connexion est honnête, et l'appelant le
 * reconnaît avec `estPanneReseau()`.
 *
 * ⚠ On ne parcourt les clés inconnues QUE pour y trouver un tableau de chaînes
 * — la forme des erreurs de champ de DRF (`{"doc_type": ["…"]}`). Une valeur
 * scalaire sous une clé inconnue n'est pas un message : le 400 des pièces en
 * double porte par exemple `document_id: "6"`, qu'il ne faut surtout pas
 * afficher comme une phrase.
 */
export function messageApi(erreur: unknown, repli: string): string {
  if (!(erreur instanceof ApiError)) return repli;

  const payload = erreur.payload as Record<string, unknown> | undefined;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    for (const cle of ["detail", "non_field_errors", "message", "error"]) {
      const valeur = payload[cle];
      if (typeof valeur === "string" && valeur.trim()) return valeur;
      if (Array.isArray(valeur) && typeof valeur[0] === "string") return valeur[0];
    }
    for (const valeur of Object.values(payload)) {
      if (Array.isArray(valeur) && typeof valeur[0] === "string") return valeur[0];
    }
  }

  /*
    Aucun message exploitable — typiquement un 500, dont DRF renvoie une page
    HTML. On dit ce qu'on sait : le serveur a répondu, et il a refusé. Mieux
    vaut un code à recopier qu'un diagnostic inventé.
  */
  if (erreur.status >= 500) {
    return `Le serveur a refusé l'envoi (erreur ${erreur.status}). Réessayez dans un instant.`;
  }
  return erreur.message || repli;
}

/**
 * Le réseau a-t-il RÉELLEMENT fait défaut ?
 *
 * Vrai seulement quand `fetch` n'a jamais obtenu de réponse. Toute `ApiError`
 * prouve le contraire — voir `messageApi`.
 */
export function estPanneReseau(erreur: unknown): boolean {
  return !(erreur instanceof ApiError);
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = await Storage.getItemAsync(Config.REFRESH_KEY);
      if (!refresh) {
        return null;
      }

      const response = await fetch(buildUrl("auth/refresh/"), {
        method: "POST",
        headers: toHeaders(),
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await readResponse<{ access?: string }>(response);
      const access = data?.access ?? null;
      if (access) {
        await Storage.setItemAsync(Config.TOKEN_KEY, access);
      }
      return access;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInitWithJson = {},
  apiOptions: ApiOptions = {},
): Promise<T> {
  const { auth = true, retryOn401 = true } = apiOptions;
  const { body, headers: requestHeaders, ...init } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = toHeaders({ ...apiOptions.headers, ...requestHeaders }, body !== undefined && !isFormData);

  if (auth) {
    const token = await Storage.getItemAsync(Config.TOKEN_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    body: body !== undefined ? (isFormData ? (body as BodyInit) : JSON.stringify(body)) : undefined,
  });

  if (response.status === 401 && auth && retryOn401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = toHeaders({ ...apiOptions.headers, ...requestHeaders }, body !== undefined && !isFormData);
      retryHeaders.set("Authorization", `Bearer ${refreshed}`);
      const retryResponse = await fetch(buildUrl(path), {
        ...init,
        headers: retryHeaders,
        body: body !== undefined ? (isFormData ? (body as BodyInit) : JSON.stringify(body)) : undefined,
      });

      if (retryResponse.ok) {
        return readResponse<T>(retryResponse);
      }

      const errorPayload = await readResponse<any>(retryResponse).catch(() => ({}));
      throw new ApiError(
        extractErrorMessage(errorPayload, `HTTP ${retryResponse.status}`),
        retryResponse.status,
        errorPayload?.code,
        errorPayload,
      );
    }

    await Storage.deleteItemAsync(Config.TOKEN_KEY);
    await Storage.deleteItemAsync(Config.REFRESH_KEY);
  }

  if (!response.ok) {
    const errorPayload = await readResponse<any>(response).catch(() => ({}));
    throw new ApiError(
      extractErrorMessage(errorPayload, `HTTP ${response.status}`),
      response.status,
      errorPayload?.code,
      errorPayload,
    );
  }

  return readResponse<T>(response);
}

const api = {
  get: <T,>(path: string, options?: ApiOptions) => request<T>(path, { method: "GET" }, options),
  post: <T,>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { method: "POST", body }, options),
  put: <T,>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { method: "PUT", body }, options),
  patch: <T,>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { method: "PATCH", body }, options),
  /**
   * ⚠ `DELETE` PORTE UN CORPS, comme les autres verbes d'écriture.
   *
   * Il n'en acceptait pas, et `request` sait pourtant en sérialiser un. Or DRF
   * lit `request.data` sur un `delete` comme sur un `post` : le retrait d'un
   * jeton de notification (`comms/fcm-token/`) désigne le jeton À RETIRER dans
   * le corps, faute de quoi le serveur ne sait pas lequel supprimer et le
   * garde. Un appareil rendu ou revendu continuerait de recevoir les
   * notifications de son ancien propriétaire.
   *
   * La signature suit celle de `post`, `put` et `patch` — corps en deuxième,
   * options en troisième. Aucun appel existant ne passait d'options ici.
   */
  delete: <T,>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { method: "DELETE", body }, options),
};

export default api;
export { request };
