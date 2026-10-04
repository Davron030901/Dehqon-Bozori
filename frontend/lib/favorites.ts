'use client';

/**
 * Saved listings — one store for every ♥ on the page.
 *
 * Buyers never register, so the device is the default home for favourites
 * (lib/session.ts keeps them). When the person is signed in with Telegram, each
 * change is also written to their account — the same table the bot's ⭐ button
 * uses — and on first load the device's list is merged into the account, so
 * nothing tapped before signing in is lost.
 *
 * A tiny subscribe/notify store instead of a context: hearts live in cards that
 * are rendered by server components, and a provider would have to wrap the
 * whole tree just to share one list of ids.
 */

import { useEffect, useState } from 'react';

import { ApiError, addFavorite, getFavoriteIds, removeFavorite, syncFavorites } from './api';
import {
  clearToken,
  getFavoritesOwner,
  getLocalFavorites,
  getToken,
  isFavoritesMergePending,
  setFavoritesMergePending,
  setFavoritesOwner,
  setLocalFavorites,
} from './session';

type Listener = (ids: string[]) => void;

let ids: string[] | null = null;
let synced = false;
const listeners = new Set<Listener>();

function current(): string[] {
  if (ids === null) ids = getLocalFavorites();
  return ids;
}

function publish(next: string[]): void {
  ids = next;
  setLocalFavorites(next);
  listeners.forEach((listener) => listener(next));
}

/** The account's list, as the server returned it for `token`. */
function publishAccount(token: string, next: string[]): void {
  // An answer that arrives after a sign-out (or a switch of account) is for
  // someone who is no longer here — writing it back would undo the reset.
  if (getToken() !== token) return;
  publish(next);
  setFavoritesOwner(token);
}

/**
 * Signed in: the account is the truth, so a heart removed on the phone does not
 * come back from this browser's stale copy. Read it once per page load.
 *
 * Unless the merge after sign-in never reached the server: then the device
 * still holds hearts the account has not seen, and replacing them with the
 * account's list would lose them. Retry the merge (a union) instead.
 */
async function syncOnce(): Promise<void> {
  if (synced) return;
  synced = true;
  const token = getToken();
  if (!token) return;
  try {
    if (isFavoritesMergePending()) {
      publishAccount(token, await syncFavorites(token, current()));
      setFavoritesMergePending(false);
    } else {
      publishAccount(token, await getFavoriteIds(token));
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // The session ended elsewhere: behave exactly like a sign-out here.
      clearToken();
      resetFavorites();
      return;
    }
    // offline — the local list still works; try again on the next page
    synced = false;
  }
}

export function isFavorite(id: string): boolean {
  return current().includes(id);
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const was = isFavorite(id);
  const next = was ? current().filter((x) => x !== id) : [id, ...current()];
  publish(next);

  const token = getToken();
  // Demo listings have no row on the server to point at.
  if (token && /^\d+$/.test(id)) {
    try {
      if (was) await removeFavorite(token, id);
      else await addFavorite(token, id);
    } catch {
      /* offline: the device keeps the change for this visit */
    }
  }
  return !was;
}

/**
 * Just signed in: the one moment to UNION the device's hearts into the
 * account, so nothing saved before signing in is lost.
 */
export async function mergeFavoritesAfterLogin(): Promise<void> {
  const token = getToken();
  if (!token) return;
  // Still a mirror of an earlier account whose session ended without a
  // sign-out here: those hearts are not this person's to merge.
  const owner = getFavoritesOwner();
  if (owner && owner !== token) publish([]);
  setFavoritesMergePending(true);
  try {
    publishAccount(token, await syncFavorites(token, current()));
    setFavoritesMergePending(false);
    synced = true;
  } catch {
    synced = false;
  }
}

/**
 * Signed out: the device list is a mirror of that account now, so it goes.
 * Otherwise the next person to sign in on this browser — a shared family
 * phone — would have the previous seller's hearts merged into their account.
 */
export function resetFavorites(): void {
  synced = false;
  setFavoritesMergePending(false);
  setFavoritesOwner(null);
  publish([]);
}

export function useFavorites(): string[] {
  const [state, setState] = useState<string[]>([]);

  useEffect(() => {
    setState(current());
    listeners.add(setState);
    void syncOnce();
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
