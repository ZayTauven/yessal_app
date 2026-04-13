import { create } from "zustand";
import { AuthService } from "@/lib/auth.service";
import type {
  ForgotPasswordPayload,
  LoginPayload,
  ProfileUpdatePayload,
  RegisterPayload,
  User,
} from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const { access } = await AuthService.getStoredTokens();
      if (access) {
        const user = await AuthService.getMe();
        set({ user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch {
      await AuthService.logout();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.login(payload);
      const user = await AuthService.getMe();
      set({ user, isAuthenticated: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.response?.data?.non_field_errors?.[0] ??
        "Identifiants incorrects. Veuillez réessayer.";
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.register(payload);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.response?.data?.email?.[0] ??
        e?.response?.data?.password?.[0] ??
        e?.response?.data?.daara_id?.[0] ??
        "Impossible de creer le compte pour le moment.";
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  forgotPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.forgotPassword(payload);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ?? "Impossible d'envoyer le lien de recuperation.";
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (payload) => {
    set({ error: null });
    try {
      const user = await AuthService.updateMe(payload);
      set({ user });
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.response?.data?.first_name?.[0] ??
        e?.response?.data?.last_name?.[0] ??
        e?.response?.data?.phone?.[0] ??
        "Impossible de mettre à jour le profil.";
      set({ error: msg });
      throw e;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await AuthService.logout();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));
