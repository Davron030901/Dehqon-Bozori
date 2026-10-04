/**
 * Browser-side seller session and offline drafts.
 *
 * The backend has no password login: a seller proves who they are by tapping a
 * t.me deep link, and the bot approves it. All this module does is remember the
 * resulting bearer token.
 *
 * It also keeps local drafts so the seller forms still "work" (as the spec
 * asks) when no backend is configured — submissions are saved in the browser
 * and clearly labelled as not-yet-published, rather than silently discarded.
 */

'use client';

import { quantityText } from './format';
import { unitLabels } from './strings';
import type { Listing, NewListingInput, SellerRegistrationInput } from './types';

const TOKEN_KEY = 'db_token';
const PROFILE_KEY = 'db_profile_draft';
const LISTINGS_KEY = 'db_listing_drafts';
const FAVORITES_KEY = 'db_favorites';
const FAVORITES_MERGE_KEY = 'db_favorites_merge_pending';

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — not worth breaking the page over */
  }
}

// --- token ---------------------------------------------------------------- //
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// --- offline drafts -------------------------------------------------------- //
export function saveProfileDraft(profile: SellerRegistrationInput): void {
  write(PROFILE_KEY, profile);
}

export function getProfileDraft(): SellerRegistrationInput | null {
  return read<SellerRegistrationInput>(PROFILE_KEY);
}

export function saveListingDraft(input: NewListingInput): Listing {
  const drafts = getListingDrafts();
  const unitLabel = unitLabels[input.unit] ?? input.unit;
  const draft: Listing = {
    id: `draft-${Date.now()}`,
    productName: input.productName,
    category: input.category,
    photoUrl: input.photoUrl,
    price: input.price,
    unit: input.unit,
    unitLabel,
    quantity: quantityText(input.quantity, unitLabel) ?? undefined,
    village: '',
    district: input.district,
    region: input.region,
    harvestDate: input.harvestDate ?? '',
    phone: input.phone,
    telegramUsername: input.telegramUsername,
    whatsappNumber: input.whatsappNumber,
    isSoldOut: false,
    createdAt: new Date().toISOString(),
    description: input.description,
    views: 0,
  };
  write(LISTINGS_KEY, [draft, ...drafts]);
  return draft;
}

export function getListingDrafts(): Listing[] {
  return read<Listing[]>(LISTINGS_KEY) ?? [];
}

export function updateListingDraft(id: string, patch: Partial<Listing>): void {
  write(
    LISTINGS_KEY,
    getListingDrafts().map((d) => (d.id === id ? { ...d, ...patch } : d)),
  );
}

export function removeListingDraft(id: string): void {
  write(
    LISTINGS_KEY,
    getListingDrafts().filter((d) => d.id !== id),
  );
}

// --- favourites ------------------------------------------------------------ //
// Buyers never register, so a heart tapped on this device is stored here. When
// the person signs in with Telegram, lib/favorites.ts merges these into the
// account (the same table the bot's ⭐ button writes to) and keeps this list as
// a mirror, so the hearts paint instantly on the next visit.
export function getLocalFavorites(): string[] {
  const ids = read<unknown>(FAVORITES_KEY);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

export function setLocalFavorites(ids: string[]): void {
  write(FAVORITES_KEY, Array.from(new Set(ids)).slice(0, 200));
}

/**
 * Set while the device's hearts still have to be merged into the account — the
 * merge right after sign-in can fail on 3G, and the next page must retry it
 * instead of replacing the device list with the account's.
 */
export function isFavoritesMergePending(): boolean {
  return read<boolean>(FAVORITES_MERGE_KEY) === true;
}

export function setFavoritesMergePending(pending: boolean): void {
  if (pending) write(FAVORITES_MERGE_KEY, true);
  else if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(FAVORITES_MERGE_KEY);
    } catch {
      /* private mode — nothing was stored either */
    }
  }
}
