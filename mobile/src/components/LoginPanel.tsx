/**
 * Sign in with Telegram — no password, no SMS.
 *
 *   1. ask the API for a one-time code and its t.me deep link
 *   2. open Telegram; the person taps "Start" and the bot approves the code
 *   3. poll until the API hands back a token
 *
 * The account IS the Telegram account, so listings posted in the bot are
 * already here. Polling speeds up the moment the person switches back from
 * Telegram, which is exactly when the answer is waiting.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text } from 'react-native';

import * as api from '@/lib/api';
import { useLanguage } from '@/lib/language';
import { useSession } from '@/lib/session';
import { colors, space } from '@/lib/theme';

import { Banner, Button, Card } from './ui';

const POLL_MS = 2000;
const LIFETIME_MS = 10 * 60 * 1000;

export default function LoginPanel({ onSignedIn, intro }: { onSignedIn?: () => void; intro?: string }) {
  const { t } = useLanguage();
  const { signIn } = useSession();
  const [state, setState] = useState<'idle' | 'waiting' | 'expired' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const login = useRef<{ code: string; deepLink: string; started: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const busy = useRef(false);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const poll = useCallback(async () => {
    const current = login.current;
    if (!current || busy.current) return;
    if (Date.now() - current.started > LIFETIME_MS) {
      stop();
      setState('expired');
      return;
    }
    busy.current = true;
    try {
      const result = await api.pollLogin(current.code);
      if (result.status === 'ok' && result.token) {
        stop();
        login.current = null;
        await signIn(result.token);
        setState('idle');
        onSignedIn?.();
      } else if (result.status === 'expired') {
        stop();
        setState('expired');
      }
    } catch {
      /* a dropped request is normal on rural 3G — keep polling */
    } finally {
      busy.current = false;
    }
  }, [onSignedIn, signIn, stop]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active' && login.current) void poll();
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [poll, stop]);

  async function begin() {
    setError(null);
    try {
      const started = await api.startLogin();
      login.current = { ...started, started: Date.now() };
      setState('waiting');
      stop();
      timer.current = setInterval(() => void poll(), POLL_MS);
      await Linking.openURL(started.deepLink);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : t.common.error);
    }
  }

  if (api.IS_DEMO) {
    return (
      <Card style={{ gap: space.md }}>
        <Text style={styles.title}>{t.auth.title}</Text>
        <Banner text={t.common.demoNotice} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.md }}>
      <Text style={styles.title}>{t.auth.title}</Text>
      <Text style={styles.body}>{intro ?? t.auth.body}</Text>
      {state === 'waiting' ? (
        <>
          <Banner text={t.auth.waiting} />
          <Button
            title={t.auth.reopen}
            icon="paper-plane"
            variant="ghost"
            onPress={() => login.current && void Linking.openURL(login.current.deepLink)}
          />
        </>
      ) : (
        <Button title={t.auth.button} icon="paper-plane" variant="telegram" onPress={() => void begin()} />
      )}
      {state === 'expired' ? <Banner tone="error" text={t.auth.expired} /> : null}
      {state === 'error' && error ? <Banner tone="error" text={error} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, color: colors.muted },
});
