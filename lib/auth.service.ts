import * as SecureStore from "expo-secure-store";
import api from "./api";
import { Config } from "@/constants/configs";
import type {
  AuthTokens,
  DaaraOption,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  ProfileUpdatePayload,
  RegisterPayload,
  RegisterResponse,
  User,
} from "@/types";

type ProfileResponse = User;

export const AuthService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>("auth/login/", payload, { auth: false });
    await SecureStore.setItemAsync(Config.TOKEN_KEY, data.access);
    await SecureStore.setItemAsync(Config.REFRESH_KEY, data.refresh);
    return data;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    return api.post<RegisterResponse>("auth/register/", payload, { auth: false });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await api.post("auth/forgot-password/", payload, { auth: false });
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync(Config.TOKEN_KEY);
    await SecureStore.deleteItemAsync(Config.REFRESH_KEY);
  },

  async getStoredTokens(): Promise<Partial<AuthTokens>> {
    const access = await SecureStore.getItemAsync(Config.TOKEN_KEY);
    const refresh = await SecureStore.getItemAsync(Config.REFRESH_KEY);
    return { access: access ?? undefined, refresh: refresh ?? undefined };
  },

  async getMe(): Promise<ProfileResponse> {
    return api.get<ProfileResponse>("profile/");
  },

  async updateMe(payload: ProfileUpdatePayload): Promise<ProfileResponse> {
    return api.patch<ProfileResponse>("profile/", payload);
  },

  async getDaaras(): Promise<DaaraOption[]> {
    const data = await api.get<DaaraOption[] | { results?: DaaraOption[] }>("daara/", {
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
};
