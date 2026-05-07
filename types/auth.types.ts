export type UserRole =
  | "admin"
  | "chef_daara"
  | "collector"
  | "member"
  | "tutelle";

export type UserStatus = "pending" | "active" | "inactive" | "blocked";

export interface LDDOption {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  location?: string | null;
  is_active: boolean;
}

export interface DaaraOption {
  id: number;
  code: string;
  name: string;
  ldd?: string | null;
  ldd_id?: number;
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

  // Additional Profile Fields
  title?: string | null;
  birth_date?: string | null;
  gender?: "male" | "female" | "other" | null;
  residence_country?: string | null;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  zip_code?: string | null;
  marital_status?: "single" | "married" | "divorced" | "widowed" | null;
  blood_type?: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResponse extends AuthTokens {
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface RegisterPayload {
  email?: string;
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
  title?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  residence_country?: string | null;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  zip_code?: string | null;
  marital_status?: string | null;
  blood_type?: string | null;
}

export interface TitleOption {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface TitleRequest {
  id: number;
  user: number;
  title: number;
  title_name?: string;
  status: "pending" | "approved" | "refused";
  note?: string;
  updated_at: string;
}

export interface UserDocument {
  id: number;
  doc_type: string;
  image?: string;
  image_verso?: string;
  status: "pending" | "validated" | "rejected";
  rejection_note?: string;
  doc_number?: string;
}
