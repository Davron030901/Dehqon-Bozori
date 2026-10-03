import Link from 'next/link';
import { Send, Smartphone } from 'lucide-react';

import { strings } from '@/lib/strings';

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || '';
const ANDROID_APP_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL || '';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-sand-200 bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="flex items-center gap-2 text-base font-extrabold text-primary-700">
            <span aria-hidden="true">🌿</span> {strings.brand}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{strings.footer.about}</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {BOT_USERNAME && (
            <a
              href={`https://t.me/${BOT_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-primary-200 hover:text-primary-700"
            >
              <Send size={15} aria-hidden="true" />
              {strings.footer.openBot}
            </a>
          )}
          {ANDROID_APP_URL && (
            <a
              href={ANDROID_APP_URL}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-primary-200 hover:text-primary-700"
            >
              <Smartphone size={15} aria-hidden="true" />
              {strings.home.appCta}
            </a>
          )}
          <Link
            href="/sotuvchi/royxatdan-otish"
            className="text-sm font-semibold text-primary-700 hover:underline"
          >
            {strings.nav.register}
          </Link>
          <p className="text-xs text-muted">
            © {year} {strings.brand}. {strings.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
