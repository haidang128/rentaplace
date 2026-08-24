export type DepositScheme = "dps" | "mydeposits" | "tds";

export type ListingStatus = "draft" | "pending_review" | "live" | "let" | "archived";

export type RoomType = "single" | "double" | "ensuite" | "studio";

/**
 * Deposit trust ladder. 0 = nothing on file. 1 = scheme declared.
 * 2 = past-tenancy certificate reviewed by our team. 3 = a tenant confirmed
 * their deposit with the scheme (the only state rendered green).
 */
export type TrustTier = 0 | 1 | 2 | 3;

export type Landlord = {
  id: string;
  displayName: string;
  nickname?: string;
  city: string;
  memberSinceYear: number;
  identityVerified: boolean;
  rightToLetVerified: boolean;
  depositSchemeDeclared: DepositScheme | null;
  certificateReviewed: boolean;
  trustTier: TrustTier;
  stats: {
    completedTenancies: number;
    depositConfirmations: number;
    depositsReturnedPct: number | null;
    responseTimeHours: number | null;
  };
};

export type Listing = {
  id: string;
  landlordId: string;
  status: ListingStatus;
  title: string;
  city: string;
  area: string;
  roomType: RoomType;
  pricePcm: number;
  depositAmount: number;
  billsIncluded: boolean;
  vietnameseFlatmates: number;
  /** Landlord says the room is within easy reach of a university. */
  nearUniversity: boolean;
  /** Lodger branch — deposit protection law does not apply. */
  liveInLandlord: boolean;
  availableFrom: string | null;
  description: string;
  photosCheckedAt: string | null;
  photoUrls: string[];
};

export type Review = {
  id: string;
  stars: number;
  body: string;
  depositReturnedInFull: boolean | null;
  reviewerLabel: string;
};
