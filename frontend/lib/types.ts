/**
 * Domain types for Dehqon Bozori.
 *
 * These describe the shape the UI works with. The backend speaks a slightly
 * different dialect (snake_case, its own category slugs); lib/api.ts is the
 * single place that translates, so components never see a raw API payload.
 */

/** The five categories shown as chips on the homepage. */
export type Category =
  | 'sabzavotlar'
  | 'mevalar'
  | 'don'
  | 'sut_mahsulotlari'
  | 'yongoqlar';

/**
 * What a listing can actually be filed under.
 *
 * The backend catalogue is wider than the five headline chips (it also has
 * melons, greens, meat, honey, seedlings…). Rather than silently dropping
 * those listings, anything outside the five lands in `boshqa`.
 */
export type ListingCategory = Category | 'boshqa';

export interface Listing {
  id: string;
  productName: string;
  category: ListingCategory;
  photoUrl?: string;
  pricePerKg: number;
  quantityKg: number;
  village: string;
  district: string;
  region: string;
  harvestDate: string;
  phone?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
  isSoldOut: boolean;
  createdAt: string;

  // Extras the API provides. Optional so a hand-written mock stays valid.
  /** Free-text note from the seller. */
  description?: string;
  /** Unit label — most produce is per kg, but honey is per litre, eggs per dona. */
  unitLabel?: string;
  /** How many buyers opened the listing. */
  views?: number;
  seller?: Seller;

  /**
   * Emoji the backend files this listing under.
   *
   * The backend catalogue is wider than the UI's five chips, so a honey listing
   * arrives as 🍯 even though the UI files it under "boshqa" (📦). Showing the
   * backend's emoji means a seller sees the same picture in the bot and here.
   * Absent on demo data, where `categoryLabels` is the fallback.
   */
  categoryEmoji?: string;

  /**
   * Human-readable district or city, resolved by the backend.
   *
   * `district` holds the stored value — a slug for anything posted after the
   * district picker existed, free text for older listings. This is what to
   * display; never render the raw slug at a buyer.
   */
  districtLabel?: string;
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

/** Sort options offered in the filter bar. */
export type SortKey = 'newest' | 'cheapest' | 'nearest';

export interface ListingFilters {
  /** Free-text search over product name / description / district. */
  query?: string;
  category?: ListingCategory | 'all';
  region?: string | 'all';
  /** District slug. Only meaningful once a region is chosen. */
  district?: string | 'all';
  sort?: SortKey;
}

/** Payload for the "add a listing" form. */
export interface NewListingInput {
  productName: string;
  category: ListingCategory;
  pricePerKg: number;
  quantityKg?: number;
  village: string;
  district: string;
  region: string;
  harvestDate?: string;
  description?: string;
  photoUrl?: string;
  phone?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
}

/** Payload for the seller registration form. */
export interface SellerRegistrationInput {
  fullName: string;
  phone: string;
  village: string;
  district: string;
  region: string;
}

/** Uniform result so pages can render a "demo data" notice honestly. */
export interface DataResult<T> {
  data: T;
  /** True when this came from lib/mockData.ts because the API was unreachable. */
  isDemo: boolean;
}
