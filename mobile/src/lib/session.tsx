/**
 * Who is signed in.
 *
 * The token lives in SecureStore; the profile (name, admin flag, language) is
 * fetched from /api/auth/me on start and after every sign-in. A token the
 * server no longer accepts is dropped quietly — the person simply becomes a
 * guest again, which is a perfectly good way to use a marketplace.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as api from './api';
import { useLanguage } from './language';
import { getToken, setToken } from './storage';
import type { SessionInfo } from './types';

interface SessionState {
  token: string | null;
  session: SessionInfo | null;
  /** True until the stored token has been checked once. */
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { setLang } = useLanguage();
  const [token, setTokenState] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (candidate: string | null, adoptLanguage: boolean) => {
      if (!candidate || api.IS_DEMO) {
        setTokenState(null);
        setSession(null);
        return;
      }
      try {
        const info = await api.fetchSession(candidate);
        if (!info) {
          await setToken(null);
          setTokenState(null);
          setSession(null);
          return;
        }
        setTokenState(candidate);
        setSession(info);
        if (adoptLanguage) setLang(info.language);
      } catch {
        // Offline: keep the token, try again on the next refresh.
        setTokenState(candidate);
      }
    },
    [setLang],
  );

  useEffect(() => {
    void (async () => {
      await load(await getToken(), false);
      setLoading(false);
    })();
  }, [load]);

  const signIn = useCallback(
    async (next: string) => {
      await setToken(next);
      await load(next, true);
    },
    [load],
  );

  const signOut = useCallback(async () => {
    if (token) await api.logout(token);
    await setToken(null);
    setTokenState(null);
    setSession(null);
  }, [token]);

  const refresh = useCallback(() => load(token, false), [load, token]);

  const value = useMemo(
    () => ({ token, session, loading, signIn, signOut, refresh }),
    [token, session, loading, signIn, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
