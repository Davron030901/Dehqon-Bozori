/**
 * Domain types for Dehqon Bozori.
 *
 * These describe the shape the UI works with. The backend speaks a slightly
 * different dialect (snake_case); lib/api.ts is the single place that
 * translates, so components never see a raw API payload.
 *
 * Category and unit keys are the backend's own slugs from
 * `backend/app/catalog.py` — the same eleven categories and seven units the
 * Telegram bot offers. An earlier version folded them into five website-only
 * buckets, which meant a seller could post honey per litre in the bot but only
 * "boshqa" per kilogram on the site. `npm run verify` and the contract suite
 * fail if these lists drift from the Python catalogue.
 */

export type CategoryKey =
  | 'vegetables'
  | 'fruits'
  | 'melons'
  | 'greens'
  | 'grains'
  | 'dried'
  | 'dairy'
  | 'meat'
  | 'honey'
  | 'seedlings'
  | 'other';

export type UnitKey = 'kg' | 'ton' | 'piece' | 'bunch' | 'sack' | 'box' | 'liter';

export interface Listing {
  id: string;
  productName: string;
  category: CategoryKey;
  photoUrl?: string;
  /** Price per one `unit`. */
  price: number;
  unit: UnitKey;
  /** "kg", "litr", "dona" — already localised by the backend. */
  unitLabel: string;
  /** Free text the seller wrote, e.g. "500 kg" or "40 litr". */
  quantity?: string;
  village: string;
  /** Stored value: a district slug, or free text on listings older than the picker. */
  district: string;
  /** What to show for `district`. Never render the raw slug at a buyer. */
  districtLabel?: string;
  region: string;
  harvestDate: string;
  phone?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
  isSoldOut: boolean;
  createdAt: string;

  // Extras the API provides. Optional so a hand-written mock stays valid.
  description?: string;
  views?: number;
  seller?: Seller;
  /**
   * Emoji the backend files this listing under — the same picture the seller
   * saw in the bot. Absent on demo data, where `categoryLabels` is the fallback.
   */
  categoryEmoji?: string;
  /** Buyers who tapped Call/Telegram/WhatsApp. Only on the seller's own listings. */
  contactsCount?: number;
}

export interface Seller {
  id: string;
  fullName: string;
  phone?: string;
  telegramUsername?: string;
  village?: string;
  district?: string;
  region?: string;
}

/** A seller's public page. */
export interface SellerProfile extends Seller {
  regionLabel?: string;
  activeListings: number;
  totalListings: number;
  memberSince?: string;
}

/** Sort options offered in the filter bar. Each maps onto one API `sort`. */
export type SortKey = 'newest' | 'cheapest' | 'expensive' | 'popular';

export interface ListingFilters {
  /** Free-text search over product name / description / district. */
  query?: string;
  category?: CategoryKey | 'all';
  region?: string | 'all';
  /** District slug. Only meaningful once a region is chosen. */
  district?: string | 'all';
  sort?: SortKey;
}

/** One page of the feed, as the API pages it. */
export interface ListingPage {
  items: Listing[];
  total: number;
  page: number;
  pages: number;
}

/** Active-listing counts per filter value — so no filter is a dead end. */
export interface Facets {
  total: number;
  categories: Record<string, number>;
  regions: Record<string, number>;
  districts: Record<string, number>;
}

/** Payload for the "add a listing" form. */
export interface NewListingInput {
  productName: string;
  category: CategoryKey;
  price: number;
  unit: UnitKey;
  /** Number only; the unit is appended when it is sent ("500" -> "500 kg"). */
  quantity?: number;
  district: string;
  region: string;
  harvestDate?: string;
  description?: string;
  photoUrl?: string;
  /** Permanent Telegram copy of the photo, when the backend archives uploads. */
  photoFileId?: string;
  phone?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
}

/** Payload for the seller registration / profile form. */
export interface SellerRegistrationInput {
  fullName: string;
  phone: string;
  village: string;
  district: string;
  region: string;
}

export type ReportReason = 'spam' | 'fraud' | 'wrong_price' | 'sold' | 'other';

export interface Report {
  id: number;
  listingId: number;
  listingTitle?: string;
  reason: ReportReason;
  note?: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

/** Uniform result so pages can render a "demo data" notice honestly. */
export interface DataResult<T> {
  data: T;
  /** True when this came from lib/mockData.ts because the API was unreachable. */
  isDemo: boolean;
}
