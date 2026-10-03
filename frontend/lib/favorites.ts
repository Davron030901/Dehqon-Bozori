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

import { addFavorite, getFavoriteIds, removeFavorite, syncFavorites } from './api';
import { getLocalFavorites, getToken, setLocalFavorites } from './session';

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

/**
 * Signed in: the account is the truth, so a heart removed on the phone does not
 * come back from this browser's stale copy. Read it once per page load.
 */
async function syncOnce(): Promise<void> {
  if (synced) return;
  synced = true;
  const token = getToken();
  if (!token) return;
  try {
    publish(await getFavoriteIds(token));
  } catch {
    /* offline or token expired — the local list still works */
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
  try {
    publish(await syncFavorites(token, current()));
    synced = true;
  } catch {
    synced = false;
  }
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
