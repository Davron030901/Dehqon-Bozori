'use client';

import { Heart } from 'lucide-react';

import { toggleFavorite, useFavorites } from '@/lib/favorites';
import { strings } from '@/lib/strings';

/**
 * ♥ — save a listing on this device (and in the account when signed in).
 *
 * `overlay` sits on a card photo; `full` is the labelled button on the detail
 * page. Every heart on the page shares one store, so saving on the detail page
 * fills the same listing's heart in the "similar" row underneath.
 */
export default function FavoriteButton({
  listingId,
  variant = 'overlay',
  className = '',
}: {
  listingId: string;
  variant?: 'overlay' | 'full';
  className?: string;
}) {
  const saved = useFavorites().includes(listingId);
  const label = saved ? strings.card.unsave : strings.card.save;

  if (variant === 'full') {
    return (
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => void toggleFavorite(listingId)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[15px] font-semibold transition ${
          saved
            ? 'border-red-200 bg-red-50 text-red-600'
            : 'border-sand-200 bg-white text-ink hover:border-primary-200 hover:bg-primary-50'
        } ${className}`}
      >
        <Heart size={18} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
        {saved ? strings.nav.favorites : strings.card.save}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={saved}
      title={label}
      onClick={() => void toggleFavorite(listingId)}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 ${
        saved ? 'text-red-500' : 'text-ink'
      } ${className}`}
    >
      <Heart size={18} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
