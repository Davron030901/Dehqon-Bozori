'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Plus } from 'lucide-react';

import { strings } from '@/lib/strings';

export default function Header() {
  const pathname = usePathname();
  const isSellerArea = pathname?.startsWith('/sotuvchi');

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand/95 backdrop-blur supports-[backdrop-filter]:bg-sand/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-primary-700"
        >
          <span aria-hidden="true" className="text-xl">
            🌿
          </span>
          <span className="whitespace-nowrap">{strings.brand}</span>
        </Link>

        <div className="flex-1" />

        <nav className="flex items-center gap-2">
          <Link
            href="/sotuvchi/kabinet"
            aria-label={strings.nav.cabinet}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition ${
              isSellerArea
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-sand-200 bg-white text-ink hover:border-primary-200'
            }`}
          >
            <LayoutGrid size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{strings.nav.cabinet}</span>
          </Link>

          <Link
            href="/sotuvchi/elon-qoshish"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-bold text-white transition hover:bg-primary-600"
          >
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{strings.nav.sell}</span>
            <span className="sm:hidden">E’lon</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
