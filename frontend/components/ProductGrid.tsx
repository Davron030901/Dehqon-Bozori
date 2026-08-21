import ProductCard from '@/components/ProductCard';
import { strings } from '@/lib/strings';
import type { Listing } from '@/lib/types';

export default function ProductGrid({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-16 text-center">
        <p className="text-4xl" aria-hidden="true">
          🌾
        </p>
        <p className="mt-2 font-bold text-ink">{strings.home.emptyTitle}</p>
        <p className="mt-1 text-sm text-muted">{strings.home.emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((listing, index) => (
        <ProductCard key={listing.id} listing={listing} priority={index < 4} />
      ))}
    </div>
  );
}
