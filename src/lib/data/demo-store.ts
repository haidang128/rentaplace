import AsyncStorage from "@react-native-async-storage/async-storage";

import { demoLandlords } from "@/lib/data/demo-data";
import type { DepositScheme, Listing } from "@/lib/types";

/**
 * Mutable demo-mode state (verification progress, created listings, admin
 * queue), persisted to AsyncStorage so flows survive reloads. Mirrors what
 * Supabase holds in real mode.
 */

export type VerificationState = {
  identityStatus: "none" | "submitted" | "approved" | "rejected";
  rightToLetStatus: "none" | "submitted" | "approved" | "rejected";
  schemeDeclared: DepositScheme | null;
  certificateStatus: "none" | "submitted" | "approved" | "rejected";
};

export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  renterId: string;
  renterName: string;
  landlordId: string;
  landlordName: string;
  lastMessageAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type QueueItem = {
  id: string;
  type: "identity" | "right_to_let" | "certificate" | "photos" | "contract_summary";
  subjectId: string;
  subjectLabel: string;
  status: "open" | "approved" | "rejected";
  createdAt: string;
};

type DemoState = {
  verifications: Record<string, VerificationState>;
  createdListings: Listing[];
  queue: QueueItem[];
  savedIds: string[];
  conversations: Conversation[];
  messages: ChatMessage[];
};

const STORAGE_KEY = "rentaplace.demo-state.v1";

function initialState(): DemoState {
  return {
    verifications: {
      // Chú Hùng: fully approved (tier 2 base). Cô Lan: scheme declared only.
      [demoLandlords[0].id]: {
        identityStatus: "approved",
        rightToLetStatus: "approved",
        schemeDeclared: "dps",
        certificateStatus: "approved",
      },
      [demoLandlords[1].id]: {
        identityStatus: "approved",
        rightToLetStatus: "approved",
        schemeDeclared: "tds",
        certificateStatus: "none",
      },
    },
    createdListings: [],
    savedIds: [],
    conversations: [
      {
        id: "c-seed-1",
        listingId: "10000000-0000-4000-8000-000000000001",
        listingTitle: "Phòng đôi Fallowfield",
        renterId: "00000000-0000-4000-8000-000000000003",
        renterName: "Mai Phạm",
        landlordId: "00000000-0000-4000-8000-000000000001",
        landlordName: "Hùng Trần",
        lastMessageAt: "2026-07-02T09:30:00Z",
      },
    ],
    messages: [
      {
        id: "m-seed-1",
        conversationId: "c-seed-1",
        senderId: "00000000-0000-4000-8000-000000000003",
        body: "Chào chú, phòng Fallowfield còn trống không ạ? Cháu muốn xem phòng cuối tuần này.",
        createdAt: "2026-07-02T09:00:00Z",
      },
      {
        id: "m-seed-2",
        conversationId: "c-seed-1",
        senderId: "00000000-0000-4000-8000-000000000001",
        body: "Chào cháu, còn trống nhé. Thứ 7 10 giờ sáng cháu qua xem được không?",
        createdAt: "2026-07-02T09:30:00Z",
      },
    ],
    queue: [
      {
        id: "q-seed-1",
        type: "photos",
        subjectId: "10000000-0000-4000-8000-000000000006",
        subjectLabel: "Phòng đơn Moss Side — Hùng Trần",
        status: "open",
        createdAt: "2026-07-01T10:00:00Z",
      },
    ],
  };
}

let state: DemoState | null = null;

async function load(): Promise<DemoState> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    state = raw ? { ...initialState(), ...JSON.parse(raw) } : initialState();
  } catch {
    state = initialState();
  }
  return state!;
}

async function save() {
  if (state) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export const demoStore = {
  async getVerification(landlordId: string): Promise<VerificationState> {
    const s = await load();
    return (
      s.verifications[landlordId] ?? {
        identityStatus: "none",
        rightToLetStatus: "none",
        schemeDeclared: null,
        certificateStatus: "none",
      }
    );
  },

  async updateVerification(landlordId: string, patch: Partial<VerificationState>, queueLabel?: string) {
    const s = await load();
    const current = await this.getVerification(landlordId);
    s.verifications[landlordId] = { ...current, ...patch };
    if (queueLabel) {
      const type =
        patch.identityStatus === "submitted"
          ? "identity"
          : patch.rightToLetStatus === "submitted"
            ? "right_to_let"
            : "certificate";
      s.queue.push({
        id: `q-${Date.now()}`,
        type,
        subjectId: landlordId,
        subjectLabel: queueLabel,
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }
    await save();
  },

  async addListing(listing: Listing, queueLabel: string) {
    const s = await load();
    s.createdListings.push(listing);
    s.queue.push({
      id: `q-${Date.now()}`,
      type: "photos",
      subjectId: listing.id,
      subjectLabel: queueLabel,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    await save();
  },

  async getCreatedListings(landlordId?: string): Promise<Listing[]> {
    const s = await load();
    return landlordId ? s.createdListings.filter((l) => l.landlordId === landlordId) : s.createdListings;
  },

  async getSavedIds(): Promise<string[]> {
    const s = await load();
    return s.savedIds;
  },

  async toggleSaved(listingId: string): Promise<string[]> {
    const s = await load();
    s.savedIds = s.savedIds.includes(listingId)
      ? s.savedIds.filter((id) => id !== listingId)
      : [...s.savedIds, listingId];
    await save();
    return s.savedIds;
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const s = await load();
    return s.conversations
      .filter((c) => c.renterId === userId || c.landlordId === userId)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  async getOrCreateConversation(input: Omit<Conversation, "id" | "lastMessageAt">): Promise<Conversation> {
    const s = await load();
    const existing = s.conversations.find(
      (c) => c.listingId === input.listingId && c.renterId === input.renterId,
    );
    if (existing) return existing;
    const conv: Conversation = { ...input, id: `c-${Date.now()}`, lastMessageAt: new Date().toISOString() };
    s.conversations.push(conv);
    await save();
    return conv;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const s = await load();
    return s.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async sendMessage(conversationId: string, senderId: string, body: string): Promise<ChatMessage> {
    const s = await load();
    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      conversationId,
      senderId,
      body,
      createdAt: new Date().toISOString(),
    };
    s.messages.push(msg);
    const conv = s.conversations.find((c) => c.id === conversationId);
    if (conv) conv.lastMessageAt = msg.createdAt;
    await save();
    return msg;
  },

  async getQueue(): Promise<QueueItem[]> {
    const s = await load();
    return [...s.queue].sort((a, b) => (a.status === "open" ? -1 : 1) - (b.status === "open" ? -1 : 1));
  },

  async resolveQueueItem(id: string, resolution: "approved" | "rejected") {
    const s = await load();
    const item = s.queue.find((q) => q.id === id);
    if (!item) return;
    item.status = resolution;

    // Reflect the decision back onto the subject, like the real backend would.
    if (item.type === "identity" || item.type === "right_to_let" || item.type === "certificate") {
      const v = s.verifications[item.subjectId];
      if (v) {
        if (item.type === "identity") v.identityStatus = resolution;
        if (item.type === "right_to_let") v.rightToLetStatus = resolution;
        if (item.type === "certificate") v.certificateStatus = resolution;
      }
    }
    if (item.type === "photos") {
      const listing = s.createdListings.find((l) => l.id === item.subjectId);
      if (listing) listing.status = resolution === "approved" ? "live" : "draft";
    }
    await save();
  },
};
