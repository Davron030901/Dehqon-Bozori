/**
 * The one and only data access layer.
 *
 * Components never touch `fetch` or `mockData` — they call the functions here.
 * That is what makes the data source swappable: point NEXT_PUBLIC_API_URL at a
 * different backend (or replace the bodies of these functions with Supabase
 * queries) and nothing in app/ or components/ changes.
 *
 * Every read falls back to the demo data in mockData.ts when the API is
 * unreachable, so the site is never a blank page — and reports `isDemo: true`
 * so the UI can say so honestly instead of pretending the fake produce is real.
 */

import { getMockListingById, mockListings } from './mockData';
import type {
  DataResult,
  Listing,
  ListingCategory,
  ListingFilters,
  NewListingInput,
  Seller,
  SellerRegistrationInput,
  SortKey,
} from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
export const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || '';

/** How long to wait before deciding the backend is not there. */
const TIMEOUT_MS = 6000;

// --------------------------------------------------------------------------- //
//  Backend payload shapes (snake_case, as FastAPI returns them)
// --------------------------------------------------------------------------- //
interface ApiSeller {
  id: number;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  region: string | null;
  village: string | null;
}

interface ApiListing {
  id: number;
  title: string;
  category: string;
  category_label: string;
  category_emoji: string;
  description: string | null;
  price: number;
  price_display: string;
  currency: string;
  unit: string;
  unit_label: string;
  quantity: string | null;
  region: string;
  region_label: string;
  district: string | null;
  district_label: string | null;
  photo: string | null;
  has_photo: boolean;
  phone: string | null;
  telegram_username: string | null;
  whatsapp: string | null;
  status: string;
  source: string;
  views: number;
  harvest_date: string | null;
  is_new_today: boolean;
  created_at: string;
  seller: ApiSeller | null;
}

interface ApiPage {
  items: ApiListing[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// --------------------------------------------------------------------------- //
//  Category translation
// --------------------------------------------------------------------------- //
/** Backend catalogue slug -> the category the UI files it under. */
const FROM_API: Record<string, ListingCategory> = {
  vegetables: 'sabzavotlar',
  greens: 'sabzavotlar',
  fruits: 'mevalar',
  melons: 'mevalar',
  grains: 'don',
  dairy: 'sut_mahsulotlari',
  dried: 'yongoqlar',
  meat: 'boshqa',
  honey: 'boshqa',
  seedlings: 'boshqa',
  other: 'boshqa',
};

/** UI category -> the slug the backend stores. */
const TO_API: Record<ListingCategory, string> = {
  sabzavotlar: 'vegetables',
  mevalar: 'fruits',
  don: 'grains',
  sut_mahsulotlari: 'dairy',
  yongoqlar: 'dried',
  boshqa: 'other',
};

export function toApiCategory(category: ListingCategory): string {
  return TO_API[category] ?? 'other';
}

// --------------------------------------------------------------------------- //
//  Mapping
// --------------------------------------------------------------------------- //
/** "500 kg" / "40 litr" / null -> 500 / 40 / 0 */
function parseQuantity(raw: string | null): number {
  if (!raw) return 0;
  const match = raw.replace(/\s/g, '').match(/[\d.]+/);
  const value = match ? Number.parseFloat(match[0]) : NaN;
  return Number.isFinite(value) ? value : 0;
}

/** Backend photo paths are relative ("/media/…"); make them absolute. */
export function absolutePhotoUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_URL) return undefined;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function mapSeller(seller: ApiSeller | null): Seller | undefined {
  if (!seller) return undefined;
  return {
    id: String(seller.id),
    fullName: seller.full_name || seller.username || 'Dehqon',
    phone: seller.phone || undefined,
    telegramUsername: seller.username || undefined,
    village: seller.village || undefined,
    region: seller.region || undefined,
  };
}

function mapListing(item: ApiListing): Listing {
  return {
    id: String(item.id),
    productName: item.title,
    category: FROM_API[item.category] ?? 'boshqa',
    photoUrl: absolutePhotoUrl(item.photo),
    pricePerKg: item.price,
    quantityKg: parseQuantity(item.quantity),
    village: item.seller?.village || item.district_label || item.district || '',
    district: item.district || '',
    region: item.region,
    harvestDate: item.harvest_date || '',
    phone: item.phone || undefined,
    telegramUsername: item.telegram_username || undefined,
    whatsappNumber: item.whatsapp || undefined,
    isSoldOut: item.status === 'sold',
    createdAt: item.created_at,
    description: item.description || undefined,
    unitLabel: item.unit_label,
    views: item.views,
    seller: mapSeller(item.seller),
    // The backend catalogue is wider than the UI's five chips, so this is the
    // emoji a honey listing actually carries — the same one the bot shows.
    categoryEmoji: item.category_emoji || undefined,
    districtLabel: item.district_label || undefined,
  };
}

// --------------------------------------------------------------------------- //
//  Transport
// --------------------------------------------------------------------------- //
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Server components should not cache listing data across requests. */
  revalidate?: number;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError('NEXT_PUBLIC_API_URL is not configured', 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {};
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  // `next` is Next.js's addition to RequestInit; spelling the type out here
  // keeps this file honest outside a Next build too.
  const init: RequestInit & { next?: { revalidate: number } } = {
    method: options.method || 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
    signal: options.signal ?? controller.signal,
  };

  if (options.revalidate === undefined) {
    init.cache = 'no-store'; // listings change all day — never serve a stale bazaar
  } else {
    init.next = { revalidate: options.revalidate };
  }

  try {
    const response = await fetch(`${API_URL}${path}`, init);

    if (response.status === 204) return undefined as T;

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = (payload as { detail?: unknown } | null)?.detail;
      const message = Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ')
        : typeof detail === 'string'
          ? detail
          : `So’rov bajarilmadi (${response.status})`;
      throw new ApiError(message, response.status);
    }
    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}

// --------------------------------------------------------------------------- //
//  Reads — these are the functions pages call
// --------------------------------------------------------------------------- //

/**
 * Every active listing (first page, generous size) ready for client-side
 * search / filter / sort.
 */
export async function getListings(): Promise<DataResult<Listing[]>> {
  try {
    const page = await request<ApiPage>('/api/listings?per_page=100&include_sold=false');
    return { data: page.items.map(mapListing), isDemo: false };
  } catch {
    return { data: mockListings.filter((l) => !l.isSoldOut), isDemo: true };
  }
}

export async function getListingById(id: string): Promise<DataResult<Listing | null>> {
  try {
    const item = await request<ApiListing>(`/api/listings/${encodeURIComponent(id)}`);
    return { data: mapListing(item), isDemo: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { data: null, isDemo: false };
    }
    return { data: getMockListingById(id) ?? null, isDemo: true };
  }
}

export interface MarketStats {
  activeListings: number;
  sellers: number;
  regions: number;
}

export async function getStats(): Promise<DataResult<MarketStats>> {
  try {
    const stats = await request<{
      active_listings: number;
      sellers: number;
      regions: number;
    }>('/api/stats');
    return {
      data: {
        activeListings: stats.active_listings,
        sellers: stats.sellers,
        regions: stats.regions,
      },
      isDemo: false,
    };
  } catch {
    const active = mockListings.filter((l) => !l.isSoldOut);
    return {
      data: {
        activeListings: active.length,
        sellers: new Set(active.map((l) => l.seller?.id ?? l.phone)).size,
        regions: new Set(active.map((l) => l.region)).size,
      },
      isDemo: true,
    };
  }
}

// --------------------------------------------------------------------------- //
//  Seller session (Telegram deep-link login — no password, no SMS)
// --------------------------------------------------------------------------- //
export interface LoginStart {
  code: string;
  deepLink: string;
}

export async function startTelegramLogin(): Promise<LoginStart> {
  const res = await request<{ code: string; deep_link: string }>('/api/auth/start', {
    method: 'POST',
  });
  return { code: res.code, deepLink: res.deep_link };
}

export interface LoginPoll {
  status: 'pending' | 'ok' | 'expired';
  token?: string;
  seller?: Seller;
}

export async function pollTelegramLogin(code: string): Promise<LoginPoll> {
  const res = await request<{
    status: 'pending' | 'ok' | 'expired';
    token: string | null;
    user: ApiSeller | null;
  }>(`/api/auth/poll?code=${encodeURIComponent(code)}`);
  return {
    status: res.status,
    token: res.token ?? undefined,
    seller: mapSeller(res.user),
  };
}

export async function getMe(token: string): Promise<Seller | null> {
  try {
    const res = await request<{ user: ApiSeller }>('/api/auth/me', { token });
    return mapSeller(res.user) ?? null;
  } catch {
    return null;
  }
}

export interface SessionInfo {
  seller: Seller;
  /** True when this Telegram id is listed in the backend's ADMIN_IDS. */
  isAdmin: boolean;
  listingsCount: number;
}

/**
 * Like `getMe`, but also reports whether the backend considers this person an
 * admin. The admin page needs that answer before it renders anything — and it
 * has to come from the server, since a browser flag would be worth nothing.
 */
export async function getSession(token: string): Promise<SessionInfo | null> {
  try {
    const res = await request<{
      user: ApiSeller;
      is_admin: boolean;
      listings_count: number;
    }>('/api/auth/me', { token });
    const seller = mapSeller(res.user);
    if (!seller) return null;
    return {
      seller,
      isAdmin: Boolean(res.is_admin),
      listingsCount: res.listings_count ?? 0,
    };
  } catch {
    return null;
  }
}

export async function updateProfile(
  token: string,
  input: SellerRegistrationInput,
): Promise<Seller | null> {
  const res = await request<{ user: ApiSeller }>('/api/auth/me', {
    method: 'PATCH',
    token,
    body: {
      full_name: input.fullName,
      phone: input.phone,
      region: input.region,
      village: input.village,
    },
  });
  return mapSeller(res.user) ?? null;
}

// --------------------------------------------------------------------------- //
//  Writes
// --------------------------------------------------------------------------- //
export async function uploadPhoto(token: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await request<{ photo_url: string }>('/api/my/upload', {
    method: 'POST',
    token,
    body: form,
  });
  return res.photo_url;
}

export async function createListing(
  token: string,
  input: NewListingInput,
): Promise<Listing> {
  const item = await request<ApiListing>('/api/my/listings', {
    method: 'POST',
    token,
    body: {
      title: input.productName,
      category: toApiCategory(input.category),
      price: input.pricePerKg,
      unit: 'kg',
      quantity: input.quantityKg ? `${input.quantityKg} kg` : null,
      region: input.region,
      district: input.district || null,
      description: input.description || null,
      phone: input.phone || null,
      telegram_username: input.telegramUsername || null,
      whatsapp: input.whatsappNumber || null,
      harvest_date: input.harvestDate || null,
      photo_url: input.photoUrl || null,
    },
  });
  return mapListing(item);
}

export async function getMyListings(token: string): Promise<Listing[]> {
  const items = await request<ApiListing[]>('/api/my/listings', { token });
  return items.map(mapListing);
}

export async function setListingSold(
  token: string,
  id: string,
  sold: boolean,
): Promise<Listing> {
  const item = await request<ApiListing>(`/api/my/listings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body: { status: sold ? 'sold' : 'active' },
  });
  return mapListing(item);
}

export async function deleteListing(token: string, id: string): Promise<void> {
  await request<void>(`/api/my/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

// --------------------------------------------------------------------------- //
//  Contact analytics
// --------------------------------------------------------------------------- //
export type ContactChannel = 'call' | 'telegram' | 'whatsapp';

/**
 * Tell the backend a buyer tapped Call / Telegram / WhatsApp.
 *
 * Fire-and-forget by design: this must never delay opening the dialer, and it
 * must never surface an error — a failed analytics ping is not the buyer's
 * problem. `sendBeacon` survives the page being replaced by the phone app,
 * which a normal request often does not; `keepalive` is the fallback.
 *
 * Lives here rather than in the component so `lib/api.ts` stays the only place
 * in the app that talks to the network — which is what makes the backend
 * swappable in one file.
 */
export function reportContact(listingId: string, channel: ContactChannel): void {
  if (!listingId || !API_URL) return;
  const url = `${API_URL}/api/listings/${encodeURIComponent(listingId)}/contact?channel=${channel}`;
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon(url);
      return;
    }
    void fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never break a phone call */
  }
}

// --------------------------------------------------------------------------- //
//  Admin — the founder posting for growers who phoned instead of typing
// --------------------------------------------------------------------------- //
export interface AdminKeyCount {
  key: string;
  count: number;
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
  };
  byCategory: AdminKeyCount[];
  byRegion: AdminKeyCount[];
  bySource: AdminKeyCount[];
  byChannel: AdminKeyCount[];
  topListings: { id: number; title: string; views: number }[];
}

interface ApiDashboard {
  totals: {
    listings: number;
    active: number;
    sold: number;
    users: number;
    contacts: number;
    contacts_week: number;
    listings_week: number;
  };
  by_category: AdminKeyCount[];
  by_region: AdminKeyCount[];
  by_source: AdminKeyCount[];
  by_channel: AdminKeyCount[];
  top_listings: { id: number; title: string; views: number }[];
}

export async function getAdminDashboard(token: string): Promise<AdminDashboard> {
  const d = await request<ApiDashboard>('/api/admin/dashboard', { token });
  return {
    totals: {
      listings: d.totals.listings,
      active: d.totals.active,
      sold: d.totals.sold,
      users: d.totals.users,
      contacts: d.totals.contacts,
      contactsWeek: d.totals.contacts_week,
      listingsWeek: d.totals.listings_week,
    },
    byCategory: d.by_category ?? [],
    byRegion: d.by_region ?? [],
    bySource: d.by_source ?? [],
    byChannel: d.by_channel ?? [],
    topListings: d.top_listings ?? [],
  };
}

/** Every listing, from every seller — the moderation view. */
export async function getAdminListings(
  token: string,
  options: { query?: string; status?: string; perPage?: number } = {},
): Promise<Listing[]> {
  const params = new URLSearchParams();
  if (options.query) params.set('q', options.query);
  if (options.status) params.set('status', options.status);
  params.set('per_page', String(options.perPage ?? 100));
  const page = await request<ApiPage>(`/api/admin/listings?${params.toString()}`, {
    token,
  });
  return page.items.map(mapListing);
}

/**
 * Create a listing for someone else.
 *
 * `sellerPhone` is the identity: the backend matches an existing seller on that
 * number, or mints one with a synthetic negative id. Call the same grower twice
 * and you get one seller with two listings, not two sellers.
 */
export interface AdminListingInput extends NewListingInput {
  sellerName?: string;
  sellerPhone: string;
}

export async function createAdminListing(
  token: string,
  input: AdminListingInput,
): Promise<Listing> {
  const item = await request<ApiListing>('/api/admin/listings', {
    method: 'POST',
    token,
    body: {
      seller_name: input.sellerName || null,
      seller_phone: input.sellerPhone,
      title: input.productName,
      category: toApiCategory(input.category),
      price: input.pricePerKg,
      unit: 'kg',
      quantity: input.quantityKg ? `${input.quantityKg} kg` : null,
      region: input.region,
      district: input.district || null,
      description: input.description || null,
      phone: input.phone || input.sellerPhone,
      telegram_username: input.telegramUsername || null,
      whatsapp: input.whatsappNumber || null,
      harvest_date: input.harvestDate || null,
      photo_url: input.photoUrl || null,
    },
  });
  return mapListing(item);
}

export async function deleteAdminListing(token: string, id: string): Promise<void> {
  await request<void>(`/api/admin/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

// --------------------------------------------------------------------------- //
//  Client-side search / filter / sort
// --------------------------------------------------------------------------- //
export function isListedToday(iso: string): boolean {
  if (!iso) return false;
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return false;
  const now = new Date();
  return (
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate()
  );
}

/**
 * Applies the homepage filters in one pass.
 *
 * `nearest` has no GPS to work with, so it means "listings in the selected
 * region first, then everything else" — with Samarkand as the default home
 * region, since that is where the project starts.
 */
export function applyFilters(listings: Listing[], filters: ListingFilters): Listing[] {
  const { query, category, region, district, sort = 'newest' } = filters;
  const needle = query?.trim().toLowerCase();

  let result = listings.filter((listing) => {
    if (category && category !== 'all' && listing.category !== category) return false;
    if (region && region !== 'all' && listing.region !== region) return false;
    if (district && district !== 'all' && listing.district !== district) return false;
    if (needle) {
      // The readable district name is searched as well as the stored value, so
      // typing "Urgut" finds a listing whose district column holds "urgut".
      const haystack = [
        listing.productName,
        listing.description,
        listing.village,
        listing.district,
        listing.districtLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const homeRegion = region && region !== 'all' ? region : 'samarkand';

  result = [...result].sort((a, b) => {
    switch (sort) {
      case 'cheapest':
        return a.pricePerKg - b.pricePerKg;
      case 'nearest': {
        const rank = (l: Listing) => (l.region === homeRegion ? 0 : 1);
        const diff = rank(a) - rank(b);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return result;
}
