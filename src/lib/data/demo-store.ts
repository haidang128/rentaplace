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
