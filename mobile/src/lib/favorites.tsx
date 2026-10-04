/**
 * Saved listings (♡).
 *
 * Buyers never have to register, so the phone is the default home for the
 * list. Signed in, the account is the truth — the same favourites the bot's ⭐
 * button and the website show — and the moment someone signs in, the hearts
 * they tapped as a guest are merged into it.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import * as api from './api';
import { useSession } from './session';
import { KEYS, readJson, writeJson } from './storage';

interface FavoritesState {
  ids: string[];
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { token, loading } = useSession();
  const [ids, setIds] = useState<string[]>([]);
  const previousToken = useRef<string | null>(null);
  const initialised = useRef(false);

  const publish = useCallback((next: string[]) => {
    const unique = Array.from(new Set(next)).slice(0, 200);
    setIds(unique);
    void writeJson(KEYS.favorites, unique);
  }, []);

  useEffect(() => {
    void readJson<string[]>(KEYS.favorites, []).then((saved) => {
      if (Array.isArray(saved)) setIds(saved.filter((x) => typeof x === 'string'));
    });
  }, []);

  // Two different moments:
  //   * the app starts with a stored session -> the account is the truth, so a
  //     heart removed on the website does not come back from this phone's copy
  //   * someone signs in right now -> merge the hearts they tapped as a guest
  useEffect(() => {
    if (loading) return;
    const before = previousToken.current;
    previousToken.current = token;
    if (!token && before) {
      // Signed out: the list on the phone was the account's list. Leaving it
      // would hand it to the next person who signs in on this phone (and merge
      // it into THEIR account), so the guest list starts empty.
      publish([]);
      void writeJson(KEYS.favoritesMergePending, false);
      return;
    }
    if (!token || token === before) return;
    const freshSignIn = before === null && initialised.current;
    initialised.current = true;
    void (async () => {
      // A merge that failed last time (3G dropped right after sign-in) is
      // retried, not replaced by the account's list — that would lose the
      // guest hearts the account never received.
      if (freshSignIn) await writeJson(KEYS.favoritesMergePending, true);
      const mergePending = await readJson<boolean>(KEYS.favoritesMergePending, false);
      try {
        if (mergePending === true) {
          publish(await api.syncFavorites(token, await readJson<string[]>(KEYS.favorites, [])));
          await writeJson(KEYS.favoritesMergePending, false);
        } else {
          publish(await api.fetchFavoriteIds(token));
        }
      } catch {
        /* offline — the local list keeps working; a pending merge is retried next start */
      }
    })();
  }, [token, loading, publish]);

  // Mark the first settled render, so a token present at start-up counts as a
  // restored session rather than a sign-in.
  useEffect(() => {
    if (!loading && !token) initialised.current = true;
  }, [loading, token]);

  const toggle = useCallback(
    (id: string) => {
      const saved = ids.includes(id);
      publish(saved ? ids.filter((x) => x !== id) : [id, ...ids]);
      if (token && /^\d+$/.test(id)) {
        api.putFavorite(token, id, !saved).catch(() => undefined);
      }
    },
    [ids, publish, token],
  );

  const value = useMemo(
    () => ({ ids, isSaved: (id: string) => ids.includes(id), toggle }),
    [ids, toggle],
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesState {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites outside FavoritesProvider');
  return value;
}
