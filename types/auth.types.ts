export type UserRole =
  | "admin"
  | "chef_daara"
  | "collector"
  | "member"
  | "tutelle";

export type UserStatus = "pending" | "active" | "inactive" | "blocked";

export interface DaaraOption {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  chef?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  daara?: DaaraOption | null;
  daara_id?: number;
  daara_name?: string;
  avatar_url?: string | null;
  avatar?: string | null;
  last_active_at?: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse extends AuthTokens {
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  daara_id: number;
}

export interface RegisterResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  daara_id: number;
  status: UserStatus;
  role: UserRole;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
}
