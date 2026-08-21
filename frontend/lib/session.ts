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

import type { Listing, NewListingInput, SellerRegistrationInput } from './types';

const TOKEN_KEY = 'db_token';
const PROFILE_KEY = 'db_profile_draft';
const LISTINGS_KEY = 'db_listing_drafts';

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
  const draft: Listing = {
    id: `draft-${Date.now()}`,
    productName: input.productName,
    category: input.category,
    photoUrl: input.photoUrl,
    pricePerKg: input.pricePerKg,
    quantityKg: input.quantityKg ?? 0,
    village: input.village,
    district: input.district,
    region: input.region,
    harvestDate: input.harvestDate ?? '',
    phone: input.phone,
    telegramUsername: input.telegramUsername,
    whatsappNumber: input.whatsappNumber,
    isSoldOut: false,
    createdAt: new Date().toISOString(),
    description: input.description,
    unitLabel: 'kg',
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
