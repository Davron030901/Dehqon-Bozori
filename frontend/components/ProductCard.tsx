import Image from 'next/image';
import Link from 'next/link';

import Badge from '@/components/Badge';
import { isListedToday } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { categoryLabels, regionLabel, strings } from '@/lib/strings';
import type { Listing } from '@/lib/types';

export default function ProductCard({
  listing,
  /** Cards above the fold skip lazy-loading so the first paint has an image. */
  priority = false,
}: {
  listing: Listing;
  priority?: boolean;
}) {
  const category = categoryLabels[listing.category];
  // The backend's emoji wins: it knows this is honey (🍯) where the UI only
  // knows it is "boshqa" (📦), and it is the same picture the seller saw in the
  // bot. `categoryLabels` covers demo data, which never touches the API.
  const emoji = listing.categoryEmoji || category.emoji;
  const listedToday = isListedToday(listing.createdAt);
  // Never show the raw slug — `districtLabel` is the resolved name, and for
  // older listings the stored free text is already readable.
  const place = [listing.village, listing.districtLabel || listing.district]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(', ');

  return (
    <Link
      href={`/mahsulot/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary-50">
        {listing.photoUrl ? (
          <Image
            src={listing.photoUrl}
            alt={listing.productName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading={priority ? undefined : 'lazy'}
            priority={priority}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-5xl"
            role="img"
            aria-label={`${category.label} — ${strings.card.noPhoto}`}
          >
            {emoji}
          </div>
        )}

        {listedToday && !listing.isSoldOut && (
          <Badge tone="today" className="absolute left-2 top-2 shadow-sm">
            {strings.card.listedToday}
          </Badge>
        )}
        {listing.isSoldOut && (
          <Badge tone="sold" className="absolute right-2 top-2 shadow-sm">
            {strings.card.soldOut}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-ink">
          {listing.productName}
        </h3>

        <p className="text-[15px] font-extrabold text-primary-700">
          {formatPrice(listing.pricePerKg)}{' '}
          <span className="text-xs font-semibold text-muted">
            so’m/{listing.unitLabel || strings.detail.kg}
          </span>
        </p>

        <p className="mt-auto pt-1 text-xs text-muted">
          <span aria-hidden="true">📍</span> {place || regionLabel(listing.region)}
        </p>
        <p className="text-xs text-muted">{regionLabel(listing.region)}</p>
      </div>
    </Link>
  );
}
