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

  async getMyDocuments(userId: number): Promise<UserDocument[]> {
    return api.get<UserDocument[]>(`users/${userId}/documents/`);
  },

  async uploadDocument(userId: number, formData: FormData): Promise<UserDocument> {
    return api.post<UserDocument>(`users/${userId}/documents/`, formData);
  },

  async updateDocument(userId: number, docId: number, formData: FormData): Promise<UserDocument> {
    return api.patch<UserDocument>(`users/${userId}/documents/${docId}/`, formData);
  },
};
