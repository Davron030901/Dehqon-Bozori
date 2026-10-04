/**
 * Sign in with Telegram — no password, no SMS.
 *
 *   1. ask the API for a one-time code, its t.me deep link and a two-digit number
 *   2. show the number FIRST; the person then opens Telegram, taps "Start" and
 *      picks that number in the bot, which approves the code
 *   3. poll until the API hands back a token
 *
 * The account IS the Telegram account, so listings posted in the bot are
 * already here. Polling speeds up the moment the person switches back from
 * Telegram, which is exactly when the answer is waiting.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';

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
  const [state, setState] = useState<'idle' | 'waiting' | 'expired' | 'refused' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const login = useRef<{ code: string; deepLink: string; matchCode: string; started: number } | null>(null);
  const [matchCode, setMatchCode] = useState('');
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
      } else if (result.status === 'expired' || result.status === 'refused') {
        stop();
        login.current = null;
        setState(result.status);
      }
    } catch {
      /* a dropped request is normal on rural 3G — keep polling */
    } finally {
      busy.current = false;
    }
  }, [onSignedIn, signIn, stop]);

  // The timer and the foreground listener call the LATEST poll. `poll` changes
  // identity whenever signIn does (e.g. the language chips were tapped while
  // waiting); tying the timer's life to it used to stop polling for good.
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active' && login.current) void pollRef.current();
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [stop]);

  async function begin() {
    setError(null);
    try {
      const started = await api.startLogin();
      login.current = { ...started, started: Date.now() };
      setMatchCode(started.matchCode);
      setState('waiting');
      stop();
      timer.current = setInterval(() => void pollRef.current(), POLL_MS);
      // Telegram is NOT opened here: it would cover the number before it was
      // read, and a guess in the bot is wrong two times in three (and burns
      // the code). The person opens it with the button under the number.
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
          {/* The bot asks for this number, so a link someone else sent cannot
              log them into your account. */}
          <View style={styles.match}>
            <Text style={styles.matchHint}>{t.auth.matchHint}</Text>
            <Text style={styles.matchCode} accessibilityLabel={`${t.auth.matchHint} ${matchCode}`}>
              {matchCode}
            </Text>
          </View>
          <Button
            title={t.auth.openTelegram}
            icon="paper-plane"
            variant="telegram"
            onPress={() => login.current && void Linking.openURL(login.current.deepLink)}
          />
          <Banner text={t.auth.waiting} />
        </>
      ) : (
        <Button title={t.auth.button} icon="paper-plane" variant="telegram" onPress={() => void begin()} />
      )}
      {state === 'expired' ? <Banner tone="error" text={t.auth.expired} /> : null}
      {state === 'refused' ? <Banner tone="error" text={t.auth.refused} /> : null}
      {state === 'error' && error ? <Banner tone="error" text={error} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, color: colors.muted },
  match: {
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: 14,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  matchHint: { fontSize: 14, color: colors.primary700, fontWeight: '600', textAlign: 'center' },
  matchCode: { fontSize: 44, fontWeight: '800', color: colors.primary800, letterSpacing: 6 },
});
