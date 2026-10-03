/**
 * The one and only data access layer.
 *
 * Components never touch `fetch` or `mockData` — they call the functions here.
 * That is what makes the data source swappable: point NEXT_PUBLIC_API_URL at a
 * different backend and nothing in app/ or components/ changes.
 *
 * Every public read falls back to the demo data in mockData.ts when the API is
 * unreachable, so the site is never a blank page — and reports `isDemo: true`
 * so the UI can say so honestly instead of pretending the fake produce is real.
 */

import { getMockListingById, mockListings } from './mockData';
import { categoryLabels, unitLabels } from './strings';
import type {
  CategoryKey,
  DataResult,
  Facets,
  Listing,
  ListingFilters,
  ListingPage,
  NewListingInput,
  Report,
  ReportReason,
  Seller,
  SellerProfile,
  SellerRegistrationInput,
  SortKey,
  UnitKey,
} from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
export const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || '';
/** Optional Android download link (an EAS build or a Play Store page). */
export const ANDROID_APP_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL || '';

/** Listings per feed page. Small enough for 3G, big enough to scroll. */
export const PAGE_SIZE = 24;

/** How long to wait before deciding the backend is not there. */
const TIMEOUT_MS = 8000;

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
  contacts_count: number | null;
}

interface ApiPage {
  items: ApiListing[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

interface ApiSellerProfile {
  id: number;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  region: string | null;
  region_label: string | null;
  village: string | null;
  active_listings: number;
  total_listings: number;
  member_since: string | null;
}

interface ApiFacets {
  total: number;
  categories: { [key: string]: number };
  regions: { [key: string]: number };
  districts: { [key: string]: number };
}

interface ApiReport {
  id: number;
  listing_id: number;
  listing_title: string | null;
  reason: ReportReason;
  note: string | null;
  status: 'open' | 'resolved';
  created_at: string;
}

type ApiListingList = ApiListing[];
type ApiIdList = number[];
type ApiReportList = ApiReport[];

// --------------------------------------------------------------------------- //
//  Mapping
// --------------------------------------------------------------------------- //
function isCategory(key: string): key is CategoryKey {
  return Object.prototype.hasOwnProperty.call(categoryLabels, key);
}

function isUnit(key: string): key is UnitKey {
  return Object.prototype.hasOwnProperty.call(unitLabels, key);
}

/** "500 kg" / "40 litr" / "1,5 tonna" / null -> 500 / 40 / 1.5 / undefined */
export function quantityNumber(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const match = raw.replace(/\s/g, '').replace(',', '.').match(/\d+(\.\d+)?/);
  const value = match ? Number.parseFloat(match[0]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : undefined;
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
  const unit: UnitKey = isUnit(item.unit) ? item.unit : 'kg';
  return {
    id: String(item.id),
    productName: item.title,
    // An unknown slug means the backend catalogue grew before this deploy did;
    // "other" keeps the listing visible instead of crashing a lookup.
    category: isCategory(item.category) ? item.category : 'other',
    photoUrl: absolutePhotoUrl(item.photo),
    price: item.price,
    unit,
    unitLabel: item.unit_label || unitLabels[unit],
    quantity: item.quantity || undefined,
    village: item.seller?.village || '',
    district: item.district || '',
    districtLabel: item.district_label || undefined,
    region: item.region,
    harvestDate: item.harvest_date || '',
    phone: item.phone || undefined,
    telegramUsername: item.telegram_username || undefined,
    whatsappNumber: item.whatsapp || undefined,
    isSoldOut: item.status === 'sold',
    createdAt: item.created_at,
    description: item.description || undefined,
    views: item.views,
    seller: mapSeller(item.seller),
    categoryEmoji: item.category_emoji || undefined,
    contactsCount: item.contacts_count ?? undefined,
  };
}

function mapPage(page: ApiPage): ListingPage {
  return {
    items: page.items.map(mapListing),
    total: page.total,
    page: page.page,
    pages: page.pages,
  };
}

function mapReport(r: ApiReport): Report {
  return {
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.listing_title || undefined,
    reason: r.reason,
    note: r.note || undefined,
    status: r.status,
    createdAt: r.created_at,
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
//  Filters <-> URL / API query
// --------------------------------------------------------------------------- //
const SORT_TO_API: Record<SortKey, string> = {
  newest: 'new',
  cheapest: 'price_asc',
  expensive: 'price_desc',
  popular: 'popular',
};

const SORT_KEYS = Object.keys(SORT_TO_API) as SortKey[];

/** The feed's filters as the API wants them. */
export function filtersToApiParams(
  filters: ListingFilters,
  page = 1,
  perPage = PAGE_SIZE,
): URLSearchParams {
  const params = new URLSearchParams();
  const query = filters.query?.trim();
  if (query) params.set('q', query);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.region && filters.region !== 'all') {
    params.set('region', filters.region);
    if (filters.district && filters.district !== 'all') params.set('district', filters.district);
  }
  params.set('sort', SORT_TO_API[filters.sort ?? 'newest'] ?? 'new');
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  return params;
}

/**
 * The feed's filters as the browser's address bar shows them — only what
 * differs from the defaults, so a shared link reads `/?category=honey`, not a
 * wall of empty parameters.
 */
export function filtersToSearch(filters: ListingFilters): string {
  const params = new URLSearchParams();
  const query = filters.query?.trim();
  if (query) params.set('q', query);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.region && filters.region !== 'all') {
    params.set('region', filters.region);
    if (filters.district && filters.district !== 'all') params.set('district', filters.district);
  }
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** Read filters back out of a URL, ignoring anything that is not a real value. */
export function filtersFromSearch(
  search: Record<string, string | string[] | undefined>,
): Required<ListingFilters> {
  const one = (key: string) => {
    const value = search[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
  };
  const category = one('category');
  const sort = one('sort') as SortKey;
  const region = /^[a-z_]{2,32}$/.test(one('region')) ? one('region') : 'all';
  return {
    query: one('q').slice(0, 80),
    category: isCategory(category) ? category : 'all',
    region,
    // A district means nothing without its region.
    district: region !== 'all' && one('district') ? one('district').slice(0, 64) : 'all',
    sort: SORT_KEYS.includes(sort) ? sort : 'newest',
  };
}

// --------------------------------------------------------------------------- //
//  Reads — these are the functions pages call
// --------------------------------------------------------------------------- //

/** One page of the feed, filtered and sorted by the database. */
export async function getListingsPage(
  filters: ListingFilters = {},
  page = 1,
  perPage = PAGE_SIZE,
): Promise<DataResult<ListingPage>> {
  try {
    const params = filtersToApiParams(filters, page, perPage);
    const res = await request<ApiPage>(`/api/listings?${params.toString()}`);
    return { data: mapPage(res), isDemo: false };
  } catch {
    const all = applyFilters(
      mockListings.filter((l) => !l.isSoldOut),
      filters,
    );
    return { data: paginate(all, page, perPage), isDemo: true };
  }
}

export async function getFacets(region?: string): Promise<DataResult<Facets>> {
  try {
    const params = new URLSearchParams();
    if (region && region !== 'all') params.set('region', region);
    const res = await request<ApiFacets>(`/api/facets?${params.toString()}`);
    return { data: res, isDemo: false };
  } catch {
    return { data: computeFacets(mockListings, region), isDemo: true };
  }
}

/**
 * One listing. `countView: false` for every read that is not a person opening
 * the page (metadata, the edit form), so the seller's view count stays honest.
 */
export async function getListingById(
  id: string,
  { countView = true }: { countView?: boolean } = {},
): Promise<DataResult<Listing | null>> {
  try {
    const suffix = countView ? '' : '?count_view=false';
    const item = await request<ApiListing>(`/api/listings/${encodeURIComponent(id)}${suffix}`);
    return { data: mapListing(item), isDemo: false };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return { data: null, isDemo: false };
    }
    return { data: getMockListingById(id) ?? null, isDemo: true };
  }
}

/** "More like this" — same category, the seller's region first. */
export async function getSimilarListings(listing: Listing, limit = 4): Promise<Listing[]> {
  try {
    const items = await request<ApiListingList>(
      `/api/listings/${encodeURIComponent(listing.id)}/similar?limit=${limit}`,
    );
    return items.map(mapListing);
  } catch {
    return mockListings
      .filter((l) => l.category === listing.category && l.id !== listing.id && !l.isSoldOut)
      .slice(0, limit);
  }
}

/** Listings by id, in the order given — a device's saved favourites. */
export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  const wanted = ids.filter((id) => /^\d+$/.test(id)).slice(0, 100);
  let found: Listing[] = [];
  if (wanted.length && API_URL) {
    try {
      const res = await request<ApiPage>(
        `/api/listings?ids=${wanted.join(',')}&include_sold=true&per_page=100`,
      );
      found = res.items.map(mapListing);
    } catch {
      found = [];
    }
  }
  const demo = mockListings.filter((l) => ids.includes(l.id));
  const byId = new Map([...found, ...demo].map((l) => [l.id, l]));
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => Boolean(l));
}

export async function getSellerProfile(id: string): Promise<DataResult<SellerProfile | null>> {
  try {
    const s = await request<ApiSellerProfile>(`/api/sellers/${encodeURIComponent(id)}`);
    return {
      data: {
        id: String(s.id),
        fullName: s.full_name || s.username || 'Dehqon',
        phone: s.phone || undefined,
        telegramUsername: s.username || undefined,
        village: s.village || undefined,
        region: s.region || undefined,
        regionLabel: s.region_label || undefined,
        activeListings: s.active_listings,
        totalListings: s.total_listings,
        memberSince: s.member_since || undefined,
      },
      isDemo: false,
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return { data: null, isDemo: false };
    }
    const theirs = mockListings.filter((l) => l.seller?.id === id);
    const seller = theirs[0]?.seller;
    if (!seller) return { data: null, isDemo: true };
    return {
      data: {
        ...seller,
        activeListings: theirs.filter((l) => !l.isSoldOut).length,
        totalListings: theirs.length,
      },
      isDemo: true,
    };
  }
}

export async function getSellerListings(
  sellerId: string,
  page = 1,
): Promise<DataResult<ListingPage>> {
  try {
    const res = await request<ApiPage>(
      `/api/listings?seller_id=${encodeURIComponent(sellerId)}&page=${page}&per_page=${PAGE_SIZE}`,
    );
    return { data: mapPage(res), isDemo: false };
  } catch {
    const theirs = mockListings.filter((l) => l.seller?.id === sellerId && !l.isSoldOut);
    return { data: paginate(theirs, page, PAGE_SIZE), isDemo: true };
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

/** Every active listing id, for the sitemap. Capped — a sitemap is not a dump. */
export async function getSitemapListings(max = 1000): Promise<{ id: string; createdAt: string }[]> {
  const out: { id: string; createdAt: string }[] = [];
  try {
    for (let page = 1; out.length < max; page += 1) {
      const res = await request<ApiPage>(`/api/listings?page=${page}&per_page=100`);
      out.push(...res.items.map((l) => ({ id: String(l.id), createdAt: l.created_at })));
      if (page >= res.pages) break;
    }
  } catch {
    /* no backend — the sitemap lists the static pages only */
  }
  return out.slice(0, max);
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

/** Ends this browser's session only — the phone app stays signed in. */
export async function logout(token: string): Promise<void> {
  try {
    await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', token });
  } catch {
    /* an expired token is already logged out */
  }
}

// --------------------------------------------------------------------------- //
//  Favourites (the same table the bot's ⭐ button writes to)
// --------------------------------------------------------------------------- //
export async function getFavoriteIds(token: string): Promise<string[]> {
  const ids = await request<ApiIdList>('/api/my/favorites/ids', { token });
  return ids.map(String);
}

export async function addFavorite(token: string, id: string): Promise<void> {
  await request<void>(`/api/my/favorites/${encodeURIComponent(id)}`, { method: 'PUT', token });
}

export async function removeFavorite(token: string, id: string): Promise<void> {
  await request<void>(`/api/my/favorites/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

/** Push a device's favourites into the account; returns the merged set. */
export async function syncFavorites(token: string, ids: string[]): Promise<string[]> {
  const numeric = ids.filter((id) => /^\d+$/.test(id)).map(Number);
  const merged = await request<ApiIdList>('/api/my/favorites/sync', {
    method: 'POST',
    token,
    body: { ids: numeric },
  });
  return merged.map(String);
}

// --------------------------------------------------------------------------- //
//  Writes
// --------------------------------------------------------------------------- //
export interface UploadedPhoto {
  photoUrl: string;
  /** Permanent Telegram copy — survives a restart on Render's ephemeral disk. */
  photoFileId?: string;
}

export async function uploadPhoto(token: string, file: File): Promise<UploadedPhoto> {
  const form = new FormData();
  form.append('file', file);
  const res = await request<{ photo_url: string; photo_file_id: string | null }>(
    '/api/my/upload',
    { method: 'POST', token, body: form },
  );
  return { photoUrl: res.photo_url, photoFileId: res.photo_file_id || undefined };
}

/** The JSON body the backend's ListingIn / ListingPatch expects. */
export function listingInputToApi(input: Partial<NewListingInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const unitLabel = input.unit ? unitLabels[input.unit] ?? input.unit : '';
  if (input.productName !== undefined) body.title = input.productName.trim();
  if (input.category !== undefined) body.category = input.category;
  if (input.price !== undefined) body.price = input.price;
  if (input.unit !== undefined) body.unit = input.unit;
  if ('quantity' in input) {
    body.quantity = input.quantity ? `${input.quantity} ${unitLabel}`.trim() : null;
  }
  if (input.region !== undefined) body.region = input.region;
  if ('district' in input) body.district = input.district || null;
  if ('description' in input) body.description = input.description?.trim() || null;
  if ('phone' in input) body.phone = input.phone?.trim() || null;
  if ('telegramUsername' in input) {
    body.telegram_username = input.telegramUsername?.trim().replace(/^@/, '') || null;
  }
  if ('whatsappNumber' in input) body.whatsapp = input.whatsappNumber?.trim() || null;
  if ('harvestDate' in input) body.harvest_date = input.harvestDate || null;
  if (input.photoUrl) body.photo_url = input.photoUrl;
  if (input.photoFileId) body.photo_file_id = input.photoFileId;
  return body;
}

export async function createListing(token: string, input: NewListingInput): Promise<Listing> {
  const item = await request<ApiListing>('/api/my/listings', {
    method: 'POST',
    token,
    body: listingInputToApi(input),
  });
  return mapListing(item);
}

/** Edit any field of a listing the caller owns (admins: any listing). */
export async function updateListing(
  token: string,
  id: string,
  input: Partial<NewListingInput>,
): Promise<Listing> {
  const item = await request<ApiListing>(`/api/my/listings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body: listingInputToApi(input),
  });
  return mapListing(item);
}

export async function getMyListings(token: string): Promise<Listing[]> {
  const items = await request<ApiListingList>('/api/my/listings', { token });
  return items.map(mapListing);
}

export async function setListingSold(token: string, id: string, sold: boolean): Promise<Listing> {
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
//  Contact analytics + reports
// --------------------------------------------------------------------------- //
export type ContactChannel = 'call' | 'telegram' | 'whatsapp';

/**
 * Tell the backend a buyer tapped Call / Telegram / WhatsApp.
 *
 * Fire-and-forget by design: this must never delay opening the dialer, and it
 * must never surface an error — a failed analytics ping is not the buyer's
 * problem. `sendBeacon` survives the page being replaced by the phone app,
 * which a normal request often does not; `keepalive` is the fallback.
 */
export function reportContact(listingId: string, channel: ContactChannel): void {
  if (!listingId || !API_URL || listingId.startsWith('demo-')) return;
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

/** Flag a listing for the founder. Anonymous — buyers never register. */
export async function reportListing(
  listingId: string,
  reason: ReportReason,
  note?: string,
  token?: string | null,
): Promise<void> {
  await request<{ ok: boolean }>(`/api/listings/${encodeURIComponent(listingId)}/report`, {
    method: 'POST',
    token,
    body: { reason, note: note?.trim() || null },
  });
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
    openReports: number;
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
    open_reports?: number;
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
      openReports: d.totals.open_reports ?? 0,
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
      ...listingInputToApi({ ...input, phone: input.phone || input.sellerPhone }),
      seller_name: input.sellerName || null,
      seller_phone: input.sellerPhone,
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

export async function getReports(
  token: string,
  status: 'open' | 'resolved' | '' = 'open',
): Promise<Report[]> {
  const rows = await request<ApiReportList>(`/api/admin/reports?status=${status}`, { token });
  return rows.map(mapReport);
}

export async function resolveReport(token: string, id: number): Promise<void> {
  await request<ApiReport>(`/api/admin/reports/${id}`, {
    method: 'PATCH',
    token,
    body: { status: 'resolved' },
  });
}

// --------------------------------------------------------------------------- //
//  Client-side search / filter / sort — demo data, and the tests' reference
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
 * The feed filters, applied in memory.
 *
 * The live site asks the database (`getListingsPage`). This is what runs on the
 * demo data, and it implements the same rules so the demo behaves like the
 * real thing.
 */
export function applyFilters(listings: Listing[], filters: ListingFilters): Listing[] {
  const { query, category, region, district, sort = 'newest' } = filters;
  const needle = query?.trim().toLowerCase();

  const result = listings.filter((listing) => {
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

  const newest = (a: Listing, b: Listing) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  return [...result].sort((a, b) => {
    switch (sort) {
      case 'cheapest':
        return a.price - b.price || newest(a, b);
      case 'expensive':
        return b.price - a.price || newest(a, b);
      case 'popular':
        return (b.views ?? 0) - (a.views ?? 0) || newest(a, b);
      case 'newest':
      default:
        return newest(a, b);
    }
  });
}

/** The same counts `/api/facets` returns, computed over a list. */
export function computeFacets(listings: Listing[], region?: string): Facets {
  const active = listings.filter((l) => !l.isSoldOut);
  const count = (keys: (string | undefined)[]) =>
    keys.reduce<Record<string, number>>((acc, key) => {
      if (key) acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  const scoped = region && region !== 'all' ? active.filter((l) => l.region === region) : active;
  return {
    total: active.length,
    categories: count(active.map((l) => l.category)),
    regions: count(active.map((l) => l.region)),
    districts: count(scoped.map((l) => l.district)),
  };
}

export function paginate(listings: Listing[], page: number, perPage: number): ListingPage {
  const pages = Math.max(1, Math.ceil(listings.length / perPage));
  const start = (Math.max(1, page) - 1) * perPage;
  return {
    items: listings.slice(start, start + perPage),
    total: listings.length,
    page,
    pages,
  };
}
