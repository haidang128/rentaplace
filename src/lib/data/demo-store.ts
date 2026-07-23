import AsyncStorage from "@react-native-async-storage/async-storage";

import { demoLandlords, demoListings } from "@/lib/data/demo-data";
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
  /** Display names of the uploaded files, keyed by doc kind. */
  files?: Partial<Record<"identity" | "right_to_let" | "certificate", string>>;
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

export type Tenancy = {
  id: string;
  listingId: string;
  listingTitle: string;
  landlordId: string;
  renterId: string;
  moveInDate: string; // YYYY-MM-DD
  depositAmount: number;
  scheme: DepositScheme | null;
  isLodger: boolean;
  status: "active" | "ended";
  confirmedAt: string | null;
  reviewed: boolean;
};

export type ContractExtract = {
  rentPcm: number | null;
  rentDueDay: number | null;
  billsIncluded: boolean | null;
  depositAmount: number | null;
  scheme: DepositScheme | null;
  noticeMonths: number | null;
  termType: "periodic" | "fixed" | null;
  isLodgerAgreement: boolean | null;
  unusualClauses: string[];
};

export type ContractSummary = {
  listingId: string;
  status: "ai_draft" | "approved" | "rejected";
  extracted: ContractExtract;
};

/** Why a listing review was filed — drives what the admin queue says it is. */
export type OpenedReason = "new" | "photos" | "edit" | "both";

export type QueueItem = {
  id: string;
  type: "identity" | "right_to_let" | "certificate" | "photos" | "contract_summary";
  subjectId: string;
  subjectLabel: string;
  status: "open" | "approved" | "rejected";
  createdAt: string;
  /** Null on items filed before the column existed. */
  openedReason: OpenedReason | null;
  /** The admin's reason, set when rejecting. */
  resolutionNote: string | null;
};

type DemoState = {
  verifications: Record<string, VerificationState>;
  createdListings: Listing[];
  queue: QueueItem[];
  savedIds: string[];
  conversations: Conversation[];
  messages: ChatMessage[];
  tenancies: Tenancy[];
  extraReviews: { landlordId: string; stars: number; body: string; depositReturnedInFull: boolean }[];
  contractSummaries: ContractSummary[];
  landlordPhones: Record<string, string>;
  /** Edits and archives layered over both seeded and created listings. */
  listingOverrides: Record<string, Partial<Listing>>;
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
    listingOverrides: {},
    savedIds: [],
    tenancies: [],
    extraReviews: [],
    landlordPhones: {
      [demoLandlords[0].id]: "+44 7700 900001",
      [demoLandlords[1].id]: "+44 7700 900002",
    },
    contractSummaries: [
      // Seeded approved summary for the Fallowfield listing (design screen 1f)
      {
        listingId: "10000000-0000-4000-8000-000000000001",
        status: "approved",
        extracted: {
          rentPcm: 520,
          rentDueDay: 1,
          billsIncluded: true,
          depositAmount: 600,
          scheme: "dps",
          noticeMonths: 2,
          termType: "periodic",
          isLodgerAgreement: false,
          unusualClauses: [],
        },
      },
    ],
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
        openedReason: "new",
        resolutionNote: null,
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
        openedReason: null,
        resolutionNote: null,
        createdAt: new Date().toISOString(),
      });
    }
    await save();
  },

  async getLandlordPhone(landlordId: string): Promise<string | null> {
    const s = await load();
    return s.landlordPhones[landlordId] ?? null;
  },

  async setLandlordPhone(landlordId: string, phone: string) {
    const s = await load();
    const trimmed = phone.trim();
    if (trimmed) s.landlordPhones[landlordId] = trimmed;
    else delete s.landlordPhones[landlordId];
    await save();
  },

  async setListingPhotos(listingId: string, photoUrls: string[]) {
    const s = await load();
    const listing = s.createdListings.find((l) => l.id === listingId);
    if (listing) listing.photoUrls = photoUrls;
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
      openedReason: "new",
      resolutionNote: null,
    });
    await save();
  },

  async getListingOverrides(): Promise<Record<string, Partial<Listing>>> {
    const s = await load();
    return s.listingOverrides;
  },

  async overrideListing(id: string, patch: Partial<Listing>) {
    const s = await load();
    s.listingOverrides[id] = { ...s.listingOverrides[id], ...patch };
    await save();
  },

  async getVerificationRejectionNotes(
    landlordId: string,
  ): Promise<Partial<Record<"identity" | "right_to_let" | "certificate", string>>> {
    const s = await load();
    const notes: Partial<Record<"identity" | "right_to_let" | "certificate", string>> = {};
    for (const q of s.queue) {
      if (q.subjectId !== landlordId) continue;
      if (q.type !== "identity" && q.type !== "right_to_let" && q.type !== "certificate") continue;
      // Later items win, so a re-submission clears a stale rejection note.
      if (q.status === "rejected" && q.resolutionNote) notes[q.type] = q.resolutionNote;
      else delete notes[q.type];
    }
    return notes;
  },

  async getListingReview(
    id: string,
  ): Promise<{ state: "none" | "open" | "rejected"; note: string | null }> {
    const s = await load();
    const items = s.queue.filter((q) => q.type === "photos" && q.subjectId === id);
    const latest = items[items.length - 1];
    if (!latest) return { state: "none", note: null };
    const state =
      latest.status === "open" ? "open" : latest.status === "rejected" ? "rejected" : "none";
    return { state, note: state === "rejected" ? latest.resolutionNote : null };
  },

  /**
   * Put a listing back in front of the admin, mirroring what the real backend
   * does on re-submission. A live listing keeps its status while the change is
   * re-reviewed. If an item is already open its reason widens to "both".
   */
  async resubmitListing(id: string, label: string, toPendingReview: boolean, reason: OpenedReason) {
    const s = await load();
    if (toPendingReview) {
      s.listingOverrides[id] = { ...s.listingOverrides[id], status: "pending_review" };
    }
    const prior = s.queue.filter((q) => q.type === "photos" && q.subjectId === id);
    const open = prior.find((q) => q.status === "open");
    if (open) {
      if (open.openedReason && open.openedReason !== reason) open.openedReason = "both";
    } else {
      s.queue.push({
        id: `q-${Date.now()}`,
        type: "photos",
        subjectId: id,
        // Keep the label the earlier (rejected) item used so the admin queue
        // reads the same on the second pass.
        subjectLabel: prior[prior.length - 1]?.subjectLabel ?? label,
        status: "open",
        createdAt: new Date().toISOString(),
        openedReason: reason,
        resolutionNote: null,
      });
    }
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

  async getTenancies(renterId: string): Promise<Tenancy[]> {
    const s = await load();
    return s.tenancies.filter((t) => t.renterId === renterId);
  },

  async createTenancy(input: Omit<Tenancy, "id" | "status" | "confirmedAt" | "reviewed">): Promise<Tenancy> {
    const s = await load();
    const tenancy: Tenancy = { ...input, id: `t-${Date.now()}`, status: "active", confirmedAt: null, reviewed: false };
    s.tenancies.push(tenancy);
    await save();
    return tenancy;
  },

  async confirmDeposit(tenancyId: string): Promise<void> {
    const s = await load();
    const tenancy = s.tenancies.find((t) => t.id === tenancyId);
    if (tenancy) tenancy.confirmedAt = new Date().toISOString();
    await save();
  },

  async endTenancyWithReview(
    tenancyId: string,
    review: { stars: number; body: string; depositReturnedInFull: boolean },
  ): Promise<void> {
    const s = await load();
    const tenancy = s.tenancies.find((t) => t.id === tenancyId);
    if (!tenancy) return;
    tenancy.status = "ended";
    tenancy.reviewed = true;
    s.extraReviews.push({ landlordId: tenancy.landlordId, ...review });
    await save();
  },

  async getContractSummary(listingId: string): Promise<ContractSummary | null> {
    const s = await load();
    return s.contractSummaries.find((c) => c.listingId === listingId) ?? null;
  },

  async updateContractDraft(listingId: string, extracted: ContractExtract) {
    const s = await load();
    const summary = s.contractSummaries.find((c) => c.listingId === listingId);
    if (summary) summary.extracted = extracted;
    await save();
  },

  async submitContract(listingId: string, listingLabel: string, extracted: ContractExtract) {
    const s = await load();
    const existing = s.contractSummaries.find((c) => c.listingId === listingId);
    if (existing) {
      existing.extracted = extracted;
      existing.status = "ai_draft";
    } else {
      s.contractSummaries.push({ listingId, status: "ai_draft", extracted });
    }
    s.queue.push({
      id: `q-${Date.now()}`,
      type: "contract_summary",
      subjectId: listingId,
      subjectLabel: listingLabel,
      status: "open",
      openedReason: null,
      resolutionNote: null,
      createdAt: new Date().toISOString(),
    });
    await save();
  },

  /** Flywheel overlay for demo landlords: confirmations + extra reviews. */
  async getLandlordOverlay(landlordId: string): Promise<{
    confirmations: number;
    verification: VerificationState;
    extraReviews: { stars: number; body: string; depositReturnedInFull: boolean }[];
  }> {
    const s = await load();
    return {
      confirmations: s.tenancies.filter((t) => t.landlordId === landlordId && t.confirmedAt).length,
      verification: await this.getVerification(landlordId),
      extraReviews: s.extraReviews.filter((r) => r.landlordId === landlordId),
    };
  },

  async getQueue(): Promise<QueueItem[]> {
    const s = await load();
    return [...s.queue].sort((a, b) => (a.status === "open" ? -1 : 1) - (b.status === "open" ? -1 : 1));
  },

  async resolveQueueItem(id: string, resolution: "approved" | "rejected", note?: string) {
    const s = await load();
    const item = s.queue.find((q) => q.id === id);
    if (!item) return;
    item.status = resolution;
    item.resolutionNote = resolution === "rejected" ? (note?.trim() || null) : null;

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
      // Written through listingOverrides (which layer over seeded listings too,
      // not just created ones) so the decision reflects wherever the listing
      // came from. Mirrors the reflect_review_resolution trigger: a listing
      // that has passed review before stays live when a later change is
      // rejected — renters keep the version that was approved.
      const base =
        s.createdListings.find((l) => l.id === item.subjectId) ??
        demoListings.find((l) => l.id === item.subjectId);
      const current = { ...base, ...s.listingOverrides[item.subjectId] };
      const approvedBefore = current.photosCheckedAt != null;
      s.listingOverrides[item.subjectId] = {
        ...s.listingOverrides[item.subjectId],
        status: resolution === "approved" ? "live" : approvedBefore ? "live" : "draft",
        ...(resolution === "approved" ? { photosCheckedAt: new Date().toISOString() } : {}),
      };
    }
    if (item.type === "contract_summary") {
      const summary = s.contractSummaries.find((c) => c.listingId === item.subjectId);
      if (summary) summary.status = resolution;
    }
    await save();
  },
};
