'use client';

import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { API_URL, pollTelegramLogin, startTelegramLogin } from '@/lib/api';
import { setToken } from '@/lib/session';

/**
 * Passwordless sign-in for sellers.
 *
 * There is no SMS gateway and no password: the seller taps a t.me deep link,
 * the Telegram bot approves the code, and this component polls until it can
 * store a bearer token. The web account is the same account they already use
 * in the bot, so their listings follow them between the two.
 */
export default function LoginGate({
  title,
  description,
  onSignedIn,
}: {
  title: string;
  description: string;
  onSignedIn: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'expired' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function begin() {
    setStatus('waiting');
    setMessage('Telegramda tasdiqlashni kutmoqdamiz…');
    try {
      const { code, deepLink } = await startTelegramLogin();
      window.open(deepLink, '_blank', 'noopener');

      const deadline = Date.now() + 10 * 60 * 1000;
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(async () => {
        if (Date.now() > deadline) {
          if (timer.current) clearInterval(timer.current);
          setStatus('expired');
          setMessage('Muddat tugadi. Qaytadan urinib ko’ring.');
          return;
        }
        try {
          const result = await pollTelegramLogin(code);
          if (result.status === 'ok' && result.token) {
            if (timer.current) clearInterval(timer.current);
            setToken(result.token);
            onSignedIn();
          } else if (result.status === 'expired') {
            if (timer.current) clearInterval(timer.current);
            setStatus('expired');
            setMessage('Muddat tugadi. Qaytadan urinib ko’ring.');
          }
        } catch {
          /* keep polling — a dropped request is normal on rural 3G */
        }
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Xatolik yuz berdi.');
    }
  }

  if (!API_URL) {
    return (
      <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
        <p className="mt-4 rounded-xl border border-harvest/30 bg-harvest/10 px-4 py-3 text-sm text-[#8a5316]">
          Server ulanmagan. Kirish uchun <code>NEXT_PUBLIC_API_URL</code> ni sozlang —
          shu paytgacha formalar brauzeringizda saqlanadi.
        </p>
      </div>
    );
  }

  const tone =
    status === 'waiting'
      ? 'border-harvest/30 bg-harvest/10 text-[#8a5316]'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>

      <button
        type="button"
        onClick={begin}
        disabled={status === 'waiting'}
        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#229ED9] px-4 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#1b8ec3] disabled:opacity-60"
      >
        <Send size={18} aria-hidden="true" />
        Telegram orqali kirish
      </button>

      {message && (
        <p className={`mt-3 rounded-xl border px-4 py-3 text-sm ${tone}`}>{message}</p>
      )}
    </div>
  );
}
