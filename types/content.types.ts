export type EventRecurrence = "annual" | "quarterly" | "weekly" | "none";
export type MessageTarget = "global" | "daara_only";
export type Urgency = "info" | "warning" | "critical";
export type AnnouncementTargetRole =
  | "all"
  | "admin"
  | "chef_daara"
  | "collector"
  | "member";

export interface EventMedia {
  id: number;
  media_type: "photo" | "video" | "text" | "link";
  image?: string | null;
  url?: string | null;
  content?: string | null;
  created_at: string;
}

export interface EventItem {
  id: number;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  event_date?: string | null;
  recurrence: EventRecurrence;
  is_date_fixed: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  media?: EventMedia[];
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: number;
  name?: string | null;
  daara?: number | null;
  daara_name?: string | null;
  created_by?: number | null;
  created_at: string;
}

export interface Message {
  id: number;
  chat: number;
  sender: number;
  sender_email?: string;
  content: string;
  sent_at: string;
}

export interface CreateMessagePayload {
  chat: number;
  content: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  target: MessageTarget;
  daara?: number | null;
  daara_name?: string | null;
  urgency: Urgency;
  target_role: AnnouncementTargetRole;
  is_published: boolean;
  created_at: string;
  expires_at?: string | null;
}

export interface Tutelle {
  id: number;
  tutor?: number;
  first_name: string;
  last_name: string;
  relation: string;
  linked_user?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTutellePayload {
  first_name: string;
  last_name: string;
  relation: string;
}

export interface NewsGalleryImage {
  id: number;
  image: string;
  caption?: string;
  order: number;
}

export interface NewsPost {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  cover_image?: string | null;
  youtube_url?: string | null;
  is_published: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
  gallery?: NewsGalleryImage[];
}

export interface AnalyticsResponse {
  role: string;
  kpis: Array<{
    title: string;
    value: string;
    change: string;
    icon: string;
  }>;
  chartData: Array<{ name: string; total: number }>;
  daara?: string | null;
  announcements: Announcement[];
}
