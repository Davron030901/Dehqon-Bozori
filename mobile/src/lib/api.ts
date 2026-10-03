/**
 * The app's one and only door to the network.
 *
 * Screens call these functions through React Query (lib/queries.ts); nothing
 * else calls `fetch`. `npm run verify` enforces that, and the Python contract
 * suite parses `interface ApiListing` below and compares it with what the real
 * API returns — the same check the website gets.
 *
 * Pure TypeScript: no React Native imports, so the mapping and the query
 * building are unit-tested with vitest.
 */
import { API_URL, PAGE_SIZE, TIMEOUT_MS } from './config';
import { categoryEmoji, categoryLabel, isCategory, isUnit, regionLabel, unitLabel } from './catalog';
import { demoListings } from './demo';
import type {
  AdminDashboard,
  ContactChannel,
  Facets,
  Lang,
  Listing,
  ListingFilters,
  ListingPage,
  NewListingInput,
  Profile,
  Report,
  ReportReason,
  Seller,
  SellerProfile,
  SessionInfo,
  SortKey,
} from './types';

export const IS_DEMO = !API_URL;

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
  unit: string;
  unit_label: string;
  quantity: string | null;
  region: string;
  region_label: string;
  district: string | null;
  district_label: string | null;
  photo: string | null;
  phone: string | null;
  telegram_username: string | null;
  whatsapp: string | null;
  status: string;
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

interface ApiMe {
  user: ApiSeller;
  is_admin: boolean;
  language: string;
  listings_count: number;
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

interface ApiDashboard {
  totals: {
    listings: number;
    active: number;
    sold: number;
    users: number;
    contacts: number;
    contacts_week: number;
    listings_week: number;
    open_reports: number;
  };
  by_category: { key: string; count: number }[];
  by_region: { key: string; count: number }[];
  top_listings: { id: number; title: string; views: number }[];
}

type ApiListingList = ApiListing[];
type ApiIdList = number[];
type ApiReportList = ApiReport[];

// --------------------------------------------------------------------------- //
//  Mapping
// --------------------------------------------------------------------------- //
/** Backend photo paths are relative ("/media/…", "/api/photo/7"). */
export function absoluteUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_URL) return undefined;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function mapSeller(s: ApiSeller | null | undefined): Seller | undefined {
  if (!s) return undefined;
  return {
    id: String(s.id),
    fullName: s.full_name || s.username || 'Dehqon',
    phone: s.phone || undefined,
    telegramUsername: s.username || undefined,
    village: s.village || undefined,
    region: s.region || undefined,
  };
}

export function mapListing(item: ApiListing, lang: Lang = 'uz'): Listing {
  // An unknown slug means the backend catalogue grew before this app version
  // did; "other" keeps the listing visible instead of crashing a lookup.
  const category = isCategory(item.category) ? item.category : 'other';
  const unit = isUnit(item.unit) ? item.unit : 'kg';
  return {
    id: String(item.id),
    productName: item.title,
    category,
    categoryLabel: item.category_label || categoryLabel(category, lang),
    categoryEmoji: item.category_emoji || categoryEmoji(category),
    photoUrl: absoluteUrl(item.photo),
    price: item.price,
    unit,
    unitLabel: item.unit_label || unitLabel(unit, lang),
    quantity: item.quantity || undefined,
    region: item.region,
    regionLabel: item.region_label || regionLabel(item.region, lang),
    district: item.district || '',
    districtLabel: item.district_label || undefined,
    harvestDate: item.harvest_date || undefined,
    description: item.description || undefined,
    phone: item.phone || undefined,
    telegramUsername: item.telegram_username || undefined,
    whatsappNumber: item.whatsapp || undefined,
    isSoldOut: item.status === 'sold',
    isNewToday: Boolean(item.is_new_today),
    views: item.views ?? 0,
    createdAt: item.created_at,
    seller: mapSeller(item.seller),
    contactsCount: item.contacts_count ?? undefined,
  };
}

function mapPage(page: ApiPage, lang: Lang): ListingPage {
  return {
    items: page.items.map((i) => mapListing(i, lang)),
    total: page.total,
    page: page.page,
    pages: page.pages,
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
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) throw new ApiError('EXPO_PUBLIC_API_URL is not configured', 0);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = (payload as { detail?: unknown } | null)?.detail;
      const message = Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ')
        : typeof detail === 'string'
          ? detail
          : `HTTP ${response.status}`;
      throw new ApiError(message, response.status);
    }
    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}

// --------------------------------------------------------------------------- //
//  Feed
// --------------------------------------------------------------------------- //
const SORT_TO_API: Record<SortKey, string> = {
  newest: 'new',
  cheapest: 'price_asc',
  expensive: 'price_desc',
  popular: 'popular',
};

export function filtersToParams(
  filters: ListingFilters,
  page = 1,
  perPage = PAGE_SIZE,
  lang: Lang = 'uz',
): URLSearchParams {
  const params = new URLSearchParams();
  const query = filters.query?.trim();
  if (query) params.set('q', query);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.region) {
    params.set('region', filters.region);
    if (filters.district) params.set('district', filters.district);
  }
  if (filters.sellerId) params.set('seller_id', filters.sellerId);
  params.set('sort', SORT_TO_API[filters.sort ?? 'newest']);
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  params.set('lang', lang);
  return params;
}

export async function fetchListings(
  filters: ListingFilters,
  page: number,
  lang: Lang,
): Promise<ListingPage> {
  if (IS_DEMO) return demoPage(filters, page);
  const params = filtersToParams(filters, page, PAGE_SIZE, lang);
  return mapPage(await request<ApiPage>(`/api/listings?${params.toString()}`), lang);
}

export async function fetchFacets(region?: string): Promise<Facets> {
  if (IS_DEMO) return demoFacets(region);
  const params = new URLSearchParams();
  if (region) params.set('region', region);
  return request<Facets>(`/api/facets?${params.toString()}`);
}

export async function fetchListing(id: string, lang: Lang, countView = true): Promise<Listing> {
  if (IS_DEMO) {
    const found = demoListings.find((l) => l.id === id);
    if (!found) throw new ApiError('not found', 404);
    return found;
  }
  const qs = `lang=${lang}${countView ? '' : '&count_view=false'}`;
  return mapListing(await request<ApiListing>(`/api/listings/${encodeURIComponent(id)}?${qs}`), lang);
}

export async function fetchSimilar(listing: Listing, lang: Lang): Promise<Listing[]> {
  if (IS_DEMO) {
    return demoListings
      .filter((l) => l.category === listing.category && l.id !== listing.id && !l.isSoldOut)
      .slice(0, 6);
  }
  const rows = await request<ApiListingList>(
    `/api/listings/${encodeURIComponent(listing.id)}/similar?limit=6&lang=${lang}`,
  );
  return rows.map((r) => mapListing(r, lang));
}

/** Saved listings, in the order they were saved. */
export async function fetchListingsByIds(ids: string[], lang: Lang): Promise<Listing[]> {
  const wanted = ids.filter((id) => /^\d+$/.test(id) || id.startsWith('demo-')).slice(0, 100);
  if (!wanted.length) return [];
  let found: Listing[];
  if (IS_DEMO) {
    found = demoListings.filter((l) => wanted.includes(l.id));
  } else {
    const numeric = wanted.filter((id) => /^\d+$/.test(id));
    if (!numeric.length) return [];
    const page = await request<ApiPage>(
      `/api/listings?ids=${numeric.join(',')}&include_sold=true&per_page=100&lang=${lang}`,
    );
    found = page.items.map((i) => mapListing(i, lang));
  }
  const byId = new Map(found.map((l) => [l.id, l]));
  return wanted.map((id) => byId.get(id)).filter((l): l is Listing => Boolean(l));
}

export async function fetchSellerProfile(id: string, lang: Lang): Promise<SellerProfile> {
  if (IS_DEMO) {
    const theirs = demoListings.filter((l) => l.seller?.id === id);
    const seller = theirs[0]?.seller;
    if (!seller) throw new ApiError('not found', 404);
    return {
      ...seller,
      regionLabel: regionLabel(seller.region, lang),
      activeListings: theirs.filter((l) => !l.isSoldOut).length,
      totalListings: theirs.length,
    };
  }
  const s = await request<ApiSellerProfile>(`/api/sellers/${encodeURIComponent(id)}?lang=${lang}`);
  return {
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
  };
}

// --------------------------------------------------------------------------- //
//  Buyer actions — anonymous
// --------------------------------------------------------------------------- //
/**
 * Tell the backend a buyer tapped Call / Telegram / WhatsApp. Counts for the
 * seller's numbers and pings them in Telegram. Never awaited by the UI, never
 * throws — a failed ping must not stand between a buyer and a phone call.
 */
export function reportContact(listingId: string, channel: ContactChannel): void {
  if (IS_DEMO || !/^\d+$/.test(listingId)) return;
  request<unknown>(`/api/listings/${listingId}/contact?channel=${channel}&source=app`, {
    method: 'POST',
  }).catch(() => undefined);
}

export async function reportListing(
  listingId: string,
  reason: ReportReason,
  note: string,
  token?: string | null,
): Promise<void> {
  if (IS_DEMO) return;
  await request<{ ok: boolean }>(`/api/listings/${encodeURIComponent(listingId)}/report`, {
    method: 'POST',
    token,
    body: { reason, note: note.trim() || null },
  });
}

// --------------------------------------------------------------------------- //
//  Sign-in (Telegram deep link — no password, no SMS)
// --------------------------------------------------------------------------- //
export async function startLogin(): Promise<{ code: string; deepLink: string }> {
  const res = await request<{ code: string; deep_link: string }>('/api/auth/start', {
    method: 'POST',
  });
  return { code: res.code, deepLink: res.deep_link };
}

export async function pollLogin(
  code: string,
): Promise<{ status: 'pending' | 'ok' | 'expired'; token?: string }> {
  const res = await request<{ status: 'pending' | 'ok' | 'expired'; token: string | null }>(
    `/api/auth/poll?code=${encodeURIComponent(code)}`,
  );
  return { status: res.status, token: res.token ?? undefined };
}

function mapMe(res: ApiMe): SessionInfo {
  return {
    seller: mapSeller(res.user)!,
    isAdmin: Boolean(res.is_admin),
    language: res.language === 'ru' ? 'ru' : 'uz',
    listingsCount: res.listings_count ?? 0,
  };
}

/** `null` when the token is no longer valid; throws on network trouble. */
export async function fetchSession(token: string): Promise<SessionInfo | null> {
  try {
    return mapMe(await request<ApiMe>('/api/auth/me', { token }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function updateProfile(token: string, profile: Partial<Profile>): Promise<SessionInfo> {
  const body: Record<string, unknown> = {};
  if (profile.fullName !== undefined) body.full_name = profile.fullName;
  if (profile.phone !== undefined) body.phone = profile.phone;
  if (profile.region !== undefined) body.region = profile.region;
  if (profile.village !== undefined) body.village = profile.village;
  if (profile.language !== undefined) body.language = profile.language;
  return mapMe(await request<ApiMe>('/api/auth/me', { method: 'PATCH', token, body }));
}

/** Ends this phone's session only; the website stays signed in. */
export async function logout(token: string): Promise<void> {
  await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', token }).catch(() => undefined);
}

// --------------------------------------------------------------------------- //
//  Favourites — the same table the bot's ⭐ button and the website use
// --------------------------------------------------------------------------- //
export async function fetchFavoriteIds(token: string): Promise<string[]> {
  return (await request<ApiIdList>('/api/my/favorites/ids', { token })).map(String);
}

export async function putFavorite(token: string, id: string, saved: boolean): Promise<void> {
  await request<void>(`/api/my/favorites/${encodeURIComponent(id)}`, {
    method: saved ? 'PUT' : 'DELETE',
    token,
  });
}

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
//  Seller writes
// --------------------------------------------------------------------------- //
export interface LocalPhoto {
  uri: string;
  name: string;
  type: string;
}

export async function uploadPhoto(
  token: string,
  photo: LocalPhoto,
): Promise<{ photoUrl: string; photoFileId?: string }> {
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } descriptor for a file
  // on disk; the DOM typings do not know that shape.
  form.append('file', photo as unknown as Blob);
  const res = await request<{ photo_url: string; photo_file_id: string | null }>('/api/my/upload', {
    method: 'POST',
    token,
    body: form,
  });
  return { photoUrl: res.photo_url, photoFileId: res.photo_file_id || undefined };
}

/** The JSON body the backend's ListingIn / ListingPatch expects. */
export function listingBody(input: Partial<NewListingInput>, lang: Lang = 'uz'): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.productName !== undefined) body.title = input.productName.trim();
  if (input.category !== undefined) body.category = input.category;
  if (input.price !== undefined) body.price = input.price;
  if (input.unit !== undefined) body.unit = input.unit;
  if ('quantity' in input) {
    // Stored as text, the way the bot stores it: "40 litr".
    body.quantity = input.quantity
      ? `${input.quantity} ${unitLabel(input.unit ?? 'kg', lang)}`
      : null;
  }
  if (input.region !== undefined) body.region = input.region;
  if ('district' in input) body.district = input.district || null;
  if ('harvestDate' in input) body.harvest_date = input.harvestDate || null;
  if ('description' in input) body.description = input.description?.trim() || null;
  if ('phone' in input) body.phone = input.phone?.trim() || null;
  if ('telegramUsername' in input) {
    body.telegram_username = input.telegramUsername?.trim().replace(/^@/, '') || null;
  }
  if ('whatsappNumber' in input) body.whatsapp = input.whatsappNumber?.trim() || null;
  if (input.photoUrl) body.photo_url = input.photoUrl;
  if (input.photoFileId) body.photo_file_id = input.photoFileId;
  return body;
}

export async function createListing(token: string, input: NewListingInput, lang: Lang): Promise<Listing> {
  const item = await request<ApiListing>(`/api/my/listings?lang=${lang}`, {
    method: 'POST',
    token,
    body: listingBody(input, lang),
  });
  return mapListing(item, lang);
}

export async function updateListing(
  token: string,
  id: string,
  input: Partial<NewListingInput> & { status?: 'active' | 'sold' },
  lang: Lang,
): Promise<Listing> {
  const body = listingBody(input, lang);
  if (input.status) body.status = input.status;
  const item = await request<ApiListing>(`/api/my/listings/${encodeURIComponent(id)}?lang=${lang}`, {
    method: 'PATCH',
    token,
    body,
  });
  return mapListing(item, lang);
}

export async function fetchMyListings(token: string, lang: Lang): Promise<Listing[]> {
  const rows = await request<ApiListingList>(`/api/my/listings?lang=${lang}`, { token });
  return rows.map((r) => mapListing(r, lang));
}

export async function deleteListing(token: string, id: string): Promise<void> {
  await request<void>(`/api/my/listings/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

// --------------------------------------------------------------------------- //
//  Admin
// --------------------------------------------------------------------------- //
export async function fetchDashboard(token: string): Promise<AdminDashboard> {
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
    topListings: d.top_listings ?? [],
  };
}

export async function fetchReports(token: string): Promise<Report[]> {
  const rows = await request<ApiReportList>('/api/admin/reports?status=open', { token });
  return rows.map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.listing_title || undefined,
    reason: r.reason,
    note: r.note || undefined,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function resolveReport(token: string, id: number): Promise<void> {
  await request<ApiReport>(`/api/admin/reports/${id}`, {
    method: 'PATCH',
    token,
    body: { status: 'resolved' },
  });
}

export async function createAdminListing(
  token: string,
  input: NewListingInput & { sellerPhone: string; sellerName?: string },
  lang: Lang,
): Promise<Listing> {
  const item = await request<ApiListing>(`/api/admin/listings?lang=${lang}`, {
    method: 'POST',
    token,
    body: {
      ...listingBody({ ...input, phone: input.phone || input.sellerPhone }, lang),
      seller_phone: input.sellerPhone,
      seller_name: input.sellerName || null,
    },
  });
  return mapListing(item, lang);
}

export async function deleteAnyListing(token: string, id: string): Promise<void> {
  await request<void>(`/api/admin/listings/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

// --------------------------------------------------------------------------- //
//  Demo mode — no backend configured
// --------------------------------------------------------------------------- //
export function applyFilters(listings: Listing[], filters: ListingFilters): Listing[] {
  const needle = filters.query?.trim().toLowerCase();
  const rows = listings.filter((l) => {
    if (l.isSoldOut) return false;
    if (filters.category && filters.category !== 'all' && l.category !== filters.category) return false;
    if (filters.region && l.region !== filters.region) return false;
    if (filters.region && filters.district && l.district !== filters.district) return false;
    if (filters.sellerId && l.seller?.id !== filters.sellerId) return false;
    if (needle) {
      const hay = [l.productName, l.description, l.districtLabel, l.district]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  const newest = (a: Listing, b: Listing) => Date.parse(b.createdAt) - Date.parse(a.createdAt);
  return rows.sort((a, b) => {
    switch (filters.sort) {
      case 'cheapest':
        return a.price - b.price || newest(a, b);
      case 'expensive':
        return b.price - a.price || newest(a, b);
      case 'popular':
        return b.views - a.views || newest(a, b);
      default:
        return newest(a, b);
    }
  });
}

function demoPage(filters: ListingFilters, page: number): ListingPage {
  const all = applyFilters(demoListings, filters);
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: all.slice(start, start + PAGE_SIZE),
    total: all.length,
    page,
    pages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
  };
}

export function computeFacets(listings: Listing[], region?: string): Facets {
  const active = listings.filter((l) => !l.isSoldOut);
  const count = (keys: string[]) =>
    keys.reduce<Record<string, number>>((acc, k) => {
      if (k) acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
  return {
    total: active.length,
    categories: count(active.map((l) => l.category)),
    regions: count(active.map((l) => l.region)),
    districts: count(active.filter((l) => !region || l.region === region).map((l) => l.district)),
  };
}

function demoFacets(region?: string): Facets {
  return computeFacets(demoListings, region);
}
