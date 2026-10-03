'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import ProductGrid from '@/components/ProductGrid';
import { getListingsByIds } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { getToken } from '@/lib/session';
import { strings } from '@/lib/strings';
import type { Listing } from '@/lib/types';

/**
 * Saved listings. Lives on the device for anonymous buyers; signed-in sellers
 * see the same list the bot's ⭐ button keeps.
 */
export default function FavoritesPage() {
  const ids = useFavorites();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getListingsByIds(ids).then((rows) => {
      if (!cancelled) setListings(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{strings.favorites.title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-muted">{strings.favorites.subtitle}</p>
      {signedIn && (
        <p className="mt-2 text-xs font-semibold text-primary-700">✓ {strings.favorites.synced}</p>
      )}

      <div className="mt-5">
        {listings === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[3/4] w-full" />
            ))}
          </div>
        ) : (
          <ProductGrid
            listings={listings}
            empty={
              <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-14 text-center">
                <p className="text-4xl" aria-hidden="true">
                  🤍
                </p>
                <p className="mt-2 font-bold text-ink">{strings.favorites.empty}</p>
                <Link href="/" className="btn-primary mt-5">
                  {strings.favorites.emptyCta}
                </Link>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
