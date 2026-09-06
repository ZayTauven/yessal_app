import { Storage } from "./storage";
import api from "./api";
import { Config } from "@/constants/configs";
import type {
  AuthTokens,
  DaaraOption,
  LDDOption,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  ProfileUpdatePayload,
  RegisterPayload,
  RegisterResponse,
  TitleOption,
  TitleRequest,
  User,
  UserDocument,
} from "@/types";

type ProfileResponse = User;

/**
 * Une URL de média servie en relatif devient absolue ; une URL déjà absolue est
 * rendue telle quelle. Même règle que `lib/content.service.ts`, recopiée ici
 * plutôt qu'importée : les deux services ne doivent pas se tenir l'un l'autre.
 */
function absoluteMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const root = Config.API_URL.replace(/\/api\/?$/, "");
  return `${root}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalizeDocument(item: any): UserDocument {
  return {
    id: item.id,
    doc_type: item.doc_type,
    type_display: item.type_display ?? undefined,
    image: absoluteMediaUrl(item.image),
    image_verso: absoluteMediaUrl(item.image_verso),
    status: item.status,
    rejection_note: item.rejection_note ?? null,
    doc_number: item.doc_number ?? null,
    submitted_at: item.submitted_at ?? null,
    updated_at: item.updated_at ?? null,
  };
}

export const AuthService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>("auth/login/", payload, { auth: false });
    await Storage.setItemAsync(Config.TOKEN_KEY, data.access);
    await Storage.setItemAsync(Config.REFRESH_KEY, data.refresh);
    return data;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    return api.post<RegisterResponse>("auth/register/", payload, { auth: false });
  },

  /**
   * Changer son mot de passe en étant connecté.
   *
   * `POST /auth/change-password/` existait côté Django et n'était appelé par
   * AUCUN chemin mobile : la ligne « Changer le mot de passe » des Paramètres
   * renvoyait vers `/forgot`, c'est-à-dire vers un parcours par courriel. Un
   * membre inscrit par téléphone seul — l'inscription l'autorise — ne pouvait
   * donc PAS changer son mot de passe. Or ce sont justement les comptes créés
   * par un tiers, avec un mot de passe attribué, qui en ont le plus besoin.
   *
   * L'ancien mot de passe est exigé par le serveur, et c'est juste : sans lui,
   * un jeton volé suffirait à verrouiller un compte définitivement.
   *
   * ⚠ Le succès RÉVOQUE toutes les sessions (`User.revoke_sessions()`), y
   * compris celle-ci. L'appelant doit donc renvoyer à la connexion.
   */
  async changePassword(current_password: string, new_password: string): Promise<void> {
    await api.post("auth/change-password/", { current_password, new_password });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await api.post("auth/forgot-password/", payload, { auth: false });
  },

  async logout(): Promise<void> {
    await Storage.deleteItemAsync(Config.TOKEN_KEY);
    await Storage.deleteItemAsync(Config.REFRESH_KEY);
  },

  async getStoredTokens(): Promise<Partial<AuthTokens>> {
    const access = await Storage.getItemAsync(Config.TOKEN_KEY);
    const refresh = await Storage.getItemAsync(Config.REFRESH_KEY);
    return { access: access ?? undefined, refresh: refresh ?? undefined };
  },

  async getMe(): Promise<ProfileResponse> {
    return api.get<ProfileResponse>("profile/");
  },

  async updateMe(payload: ProfileUpdatePayload): Promise<ProfileResponse> {
    return api.patch<ProfileResponse>("profile/", payload);
  },

  /**
   * Le portrait, et lui seul.
   *
   * Une image ne passe pas par `updateMe` : `ProfileUpdatePayload` ne porte
   * aucun champ `avatar`, et le corps part en JSON. Il faut un `FormData` —
   * `lib/api.ts` le reconnaît et laisse alors `fetch` poser lui-même le
   * `Content-Type` avec sa frontière (`request`, le drapeau `isFormData`).
   * Poser `application/json` sur un `FormData` produit une requête sans
   * frontière, que Django rejette.
   *
   * L'ancien écran faisait tout cela à la main, avec deux `as any` pour forcer
   * un `FormData` dans une signature qui attend un objet typé. Le contournement
   * vit ici désormais, une fois, et il est nommé.
   */
  async updateAvatar(uri: string): Promise<ProfileResponse> {
    const filename = uri.split("/").pop() || "avatar.jpg";
    const extension = filename.split(".").pop()?.toLowerCase();
    const type = extension === "png" ? "image/png" : "image/jpeg";

    const form = new FormData();
    /*
      React Native accepte cet objet à trois clés là où le DOM voudrait un
      `Blob` — c'est son extension propre, et c'est ce qui rend le cast
      inévitable ici. Il ne franchit pas cette fonction.
    */
    form.append("avatar", { uri, name: filename, type } as unknown as Blob);
    return api.patch<ProfileResponse>("profile/", form);
  },

  async getDaaras(lddId?: number): Promise<DaaraOption[]> {
    const url = lddId ? `daara/?ldd_id=${lddId}` : "daara/";
    const data = await api.get<DaaraOption[] | { results?: DaaraOption[] }>(url, {
      auth: false,
    });
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  },

  async getLDDs(): Promise<LDDOption[]> {
    const data = await api.get<LDDOption[] | { results?: LDDOption[] }>("ldd/", {
      auth: false,
    });
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  },

  async getTitles(): Promise<TitleOption[]> {
    return api.get<TitleOption[]>("titles/");
  },

  async submitTitleRequest(titleId: number, note = ""): Promise<TitleRequest> {
    return api.post<TitleRequest>("title-requests/", { title: titleId, note });
  },

  /**
   * ⚠ Aucune frontière n'existait ici : le JSON brut était coulé dans
   * `UserDocument`, `image` comprise. DRF rend une URL absolue **quand le
   * sérialiseur reçoit la requête dans son contexte** — ce qui est le cas d'un
   * `ModelViewSet`, mais ce n'est pas une propriété du type. `normalizeDocument`
   * le garantit : `absoluteMediaUrl` laisse une URL absolue intacte et préfixe
   * une relative.
   */
  async getMyDocuments(userId: number): Promise<UserDocument[]> {
    const data = await api.get<any>(`users/${userId}/documents/`);
    const list = Array.isArray(data) ? data : (data?.results ?? []);
    return list.map(normalizeDocument);
  },

  async uploadDocument(userId: number, formData: FormData): Promise<UserDocument> {
    return normalizeDocument(await api.post<any>(`users/${userId}/documents/`, formData));
  },

  async updateDocument(userId: number, docId: number, formData: FormData): Promise<UserDocument> {
    return normalizeDocument(
      await api.patch<any>(`users/${userId}/documents/${docId}/`, formData),
    );
  },
};
