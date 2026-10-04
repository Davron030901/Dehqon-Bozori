/**
 * Domain types — the same shape the website uses (frontend/lib/types.ts), so a
 * listing means the same thing on every screen. lib/api.ts is the only place
 * that sees the backend's snake_case payloads.
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

export type Lang = 'uz' | 'ru';

export interface Seller {
  id: string;
  fullName: string;
  phone?: string;
  telegramUsername?: string;
  village?: string;
  region?: string;
}

export interface SellerProfile extends Seller {
  regionLabel?: string;
  activeListings: number;
  totalListings: number;
  memberSince?: string;
}

export interface Listing {
  id: string;
  productName: string;
  category: CategoryKey;
  categoryLabel: string;
  categoryEmoji: string;
  photoUrl?: string;
  price: number;
  unit: UnitKey;
  unitLabel: string;
  quantity?: string;
  region: string;
  regionLabel: string;
  district: string;
  districtLabel?: string;
  harvestDate?: string;
  description?: string;
  phone?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
  isSoldOut: boolean;
  isNewToday: boolean;
  views: number;
  createdAt: string;
  seller?: Seller;
  /** Buyers who tapped a contact button — only on the seller's own listings. */
  contactsCount?: number;
}

export type SortKey = 'newest' | 'cheapest' | 'expensive' | 'popular';

export interface ListingFilters {
  query?: string;
  category?: CategoryKey | 'all';
  region?: string;
  district?: string;
  sort?: SortKey;
  sellerId?: string;
}

export interface ListingPage {
  items: Listing[];
  total: number;
  page: number;
  pages: number;
}

export interface Facets {
  total: number;
  categories: Record<string, number>;
  regions: Record<string, number>;
  districts: Record<string, number>;
}

export interface NewListingInput {
  productName: string;
  category: CategoryKey;
  price: number;
  unit: UnitKey;
  /** Free text, as the seller wrote it; a bare number gets the unit when sent. */
  quantity?: string;
  region: string;
  district?: string;
  harvestDate?: string;
  description?: string;
  photoUrl?: string;
  photoFileId?: string;
  phone?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
}

export interface Profile {
  fullName: string;
  phone: string;
  region: string;
  village: string;
  language?: Lang;
}

export interface SessionInfo {
  seller: Seller;
  isAdmin: boolean;
  language: Lang;
  listingsCount: number;
}

export type ReportReason = 'spam' | 'fraud' | 'wrong_price' | 'sold' | 'other';
export type ContactChannel = 'call' | 'telegram' | 'whatsapp';

export interface Report {
  id: number;
  listingId: number;
  listingTitle?: string;
  reason: ReportReason;
  note?: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface AdminDashboard {
  totals: {
    listings: number;
    active: number;
    sold: number;
    users: number;
    contacts: number;
    contactsWeek: number;
    listingsWeek: number;
    openReports: number;
  };
  byCategory: { key: string; count: number }[];
  byRegion: { key: string; count: number }[];
  topListings: { id: number; title: string; views: number }[];
}
