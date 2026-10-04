/**
 * Who is signed in.
 *
 * The token lives in SecureStore; the profile (name, admin flag, language) is
 * fetched from /api/auth/me on start and after every sign-in. A token the
 * server no longer accepts is dropped quietly — the person simply becomes a
 * guest again, which is a perfectly good way to use a marketplace.
 *
 * A token the server could not be ASKED about (a cold Render instance, 3G
 * gone) is different: the person is still signed in, we just do not know
 * their profile yet. `verifying` says so, screens wait instead of treating
 * them as a guest, and the check is retried until it gets an answer.
 */
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import * as api from './api';
import { useLanguage } from './language';
import { getToken, setToken } from './storage';
import type { SessionInfo } from './types';

const RETRY_MS = 10_000;

interface SessionState {
  token: string | null;
  session: SessionInfo | null;
  /** True until the stored token has been checked once. */
  loading: boolean;
  /** Signed in, but the profile could not be fetched yet (offline / cold server). */
  verifying: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { lang, chosen, adoptLang } = useLanguage();
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // The token the latest load() is about. A slow retry that answers after the
  // person signed out (or signed in as someone else) must not bring its token back.
  const current = useRef<string | null>(null);

  const load = useCallback(async (candidate: string | null): Promise<SessionInfo | null> => {
    current.current = candidate;
    if (!candidate || api.IS_DEMO) {
      setTokenState(null);
      setSession(null);
      return null;
    }
    try {
      const info = await api.fetchSession(candidate);
      if (current.current !== candidate) return null;
      if (!info) {
        await setToken(null);
        setTokenState(null);
        setSession(null);
        return null;
      }
      setTokenState(candidate);
      setSession(info);
      return info;
    } catch {
      if (current.current !== candidate) return null;
      // Offline or the server is waking up: still signed in, profile unknown.
      setTokenState(candidate);
      return null;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load(await getToken());
      setLoading(false);
    })();
  }, [load]);

  const verifying = Boolean(token) && !session && !loading;

  // Keep asking until the server answers — on a timer and whenever the app
  // comes back to the foreground.
  useEffect(() => {
    if (!verifying) return;
    const retry = () => void load(token);
    const timer = setInterval(retry, RETRY_MS);
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') retry();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [verifying, token, load]);

  const signIn = useCallback(
    async (next: string) => {
      await setToken(next);
      const info = await load(next);
      if (!info) return;
      if (chosen && info.language !== lang) {
        // The language picked on this phone wins, and the bot learns it too.
        api.updateProfile(next, { language: lang }).catch(() => undefined);
      } else if (!chosen) {
        adoptLang(info.language);
      }
    },
    [load, chosen, lang, adoptLang],
  );

  const signOut = useCallback(async () => {
    current.current = null;
    if (token) await api.logout(token);
    await setToken(null);
    setTokenState(null);
    setSession(null);
    // Nothing of this account may outlive it on a shared family phone: cached
    // "my listings", the admin dashboard, the saved list (FavoritesProvider
    // clears its own on the token going away).
    queryClient.clear();
  }, [token, queryClient]);

  const refresh = useCallback(async () => {
    await load(token);
  }, [load, token]);

  const value = useMemo(
    () => ({ token, session, loading, verifying, signIn, signOut, refresh }),
    [token, session, loading, verifying, signIn, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
