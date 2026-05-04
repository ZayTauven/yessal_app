import api from "./api";

import type {
  CreateMessagePayload,
  AnalyticsResponse,
  Announcement,
  Chat,
  CreateTutellePayload,
  EventItem,
  Message,
  Tutelle,
} from "@/types";
import type { Campaign, CampaignEtat } from "@/types/campaign.types";
import type { CreateDonationPayload, Donation } from "@/types/donation.types";
import { Config } from "@/constants/configs";

type PaginatedResponse<T> = { results?: T[] } | T[];

function unwrapList<T>(data: PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results ?? [];
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return 0;
}

function absoluteMediaUrl(url?: string | null) {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const root = Config.API_URL.replace(/\/api\/?$/, "");
  return `${root}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalizeCampaign(item: any): Campaign {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    goal_amount: toNumber(item.goal_amount),
    collected_amount: toNumber(item.collected_amount),
    deadline: item.deadline,
    status: item.status,
    event: item.event ?? item.fete ?? null,
    event_name: item.event_name ?? item.fete_name ?? null,
    daara: item.daara ?? null,
    daara_name: item.daara_name ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at ?? undefined,
    image: absoluteMediaUrl(item.image ?? item.cover_image),
  };
}

function normalizeEvent(item: any): EventItem {
  const normalizedDate = item.event_date ?? item.date ?? null;
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    cover_image: absoluteMediaUrl(item.cover_image),
    event_date: normalizedDate,
    recurrence: item.recurrence ?? "none",
    is_date_fixed: item.is_date_fixed ?? Boolean(normalizedDate),
    created_by: item.created_by ?? null,
    created_by_name: item.created_by_name ?? null,
    media: Array.isArray(item.media)
      ? item.media.map((mediaItem: any) => ({
          ...mediaItem,
          image: absoluteMediaUrl(mediaItem.image),
        }))
      : [],
    created_at: item.created_at,
    updated_at: item.updated_at ?? item.created_at,
  };
}

function normalizeDonation(item: any): Donation {
  return {
    id: item.id,
    campaign: item.campaign,
    campaign_name: item.campaign_name ?? undefined,
    donor: item.donor ?? undefined,
    donor_name: item.donor_name ?? undefined,
    beneficiary: item.beneficiary ?? null,
    beneficiary_name: item.beneficiary_name ?? null,
    amount: toNumber(item.amount),
    payment_method: item.payment_method,
    payment_status: item.payment_status,
    collector: item.collector ?? null,
    validated_by: item.validated_by ?? null,
    validated_at: item.validated_at ?? null,
    external_ref: item.external_ref ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function normalizeChat(item: any): Chat {
  return {
    id: item.id,
    name: item.name ?? null,
    daara: item.daara ?? null,
    created_by: item.created_by ?? null,
    created_at: item.created_at,
  };
}

function normalizeMessage(item: any): Message {
  return {
    id: item.id,
    chat: item.chat,
    sender: item.sender,
    sender_email: item.sender_email ?? undefined,
    content: item.content,
    sent_at: item.sent_at,
  };
}

function normalizeAnnouncement(item: any): Announcement {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    target: item.target,
    daara: item.daara ?? null,
    daara_name: item.daara_name ?? null,
    urgency: item.urgency,
    target_role: item.target_role,
    is_published: Boolean(item.is_published),
    created_at: item.created_at,
    expires_at: item.expires_at ?? null,
  };
}

function normalizeTutelle(item: any): Tutelle {
  return {
    id: item.id,
    tutor: item.tutor ?? undefined,
    first_name: item.first_name,
    last_name: item.last_name,
    relation: item.relation,
    linked_user: item.linked_user ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export const ContentService = {
  async getCampaigns(): Promise<Campaign[]> {
    const data = await api.get<PaginatedResponse<any>>("events/campaigns/");
    return unwrapList(data).map(normalizeCampaign);
  },
  
  async getCampaignEtat(id: number): Promise<CampaignEtat> {
    return api.get<CampaignEtat>(`events/campaigns/${id}/etat/`);
  },

  async getEvents(): Promise<EventItem[]> {
    const data = await api.get<PaginatedResponse<any>>("events/fetes/");
    return unwrapList(data).map(normalizeEvent);
  },

  async getDonations(): Promise<Donation[]> {
    const data = await api.get<PaginatedResponse<any>>("contributions/");
    return unwrapList(data).map(normalizeDonation);
  },

  async createDonation(payload: CreateDonationPayload): Promise<Donation> {
    const data = await api.post<any>("contributions/", payload);
    return normalizeDonation(data);
  },

  async payDonation(id: number, payment_method: string): Promise<any> {
    return api.post<any>(`contributions/${id}/pay/`, { payment_method });
  },

  async getChats(): Promise<Chat[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/");
    return unwrapList(data).map(normalizeChat);
  },

  async getMessages(): Promise<Message[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/messages/");
    return unwrapList(data).map(normalizeMessage);
  },

  async createMessage(payload: CreateMessagePayload): Promise<Message> {
    const data = await api.post<any>("comms/messages/", payload);
    return normalizeMessage(data);
  },

  async getAnnouncements(): Promise<Announcement[]> {
    const data = await api.get<PaginatedResponse<any>>("comms/announcements/");
    return unwrapList(data).map(normalizeAnnouncement);
  },

  async getTutelles(): Promise<Tutelle[]> {
    const data = await api.get<PaginatedResponse<any>>("tutelles/");
    return unwrapList(data).map(normalizeTutelle);
  },

  async createTutelle(payload: CreateTutellePayload): Promise<Tutelle> {
    const data = await api.post<any>("tutelles/", payload);
    return normalizeTutelle(data);
  },

  async getAnalytics(): Promise<AnalyticsResponse> {
    return api.get<AnalyticsResponse>("analytics/");
  },

  async getMyDaara(): Promise<any> {
    const profile = await api.get<any>("profile/");
    return profile.daara;
  },

  async getDirectory(): Promise<any[]> {
    const data = await api.get<PaginatedResponse<any>>("directory/users/");
    return unwrapList(data);
  },
};
