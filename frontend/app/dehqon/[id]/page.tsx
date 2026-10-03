import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import ContactButtons from '@/components/ContactButtons';
import ProductGrid from '@/components/ProductGrid';
import { getSellerListings, getSellerProfile } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { regionLabel, strings } from '@/lib/strings';

export const dynamic = 'force-dynamic';

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: seller } = await getSellerProfile(params.id);
  if (!seller) return { title: strings.sellerPage.notFoundTitle };
  return {
    title: seller.fullName,
    description: `${seller.fullName} — ${seller.activeListings} ${strings.sellerPage.activeListings}. ${
      seller.regionLabel || regionLabel(seller.region || '')
    }`,
  };
}

/**
 * A grower's public page: who they are, how to reach them, everything they
 * are selling right now. Traders who buy from the same family every season
 * keep this link instead of searching each time.
 */
export default async function SellerPage({ params }: PageProps) {
  const [{ data: seller }, { data: listings }] = await Promise.all([
    getSellerProfile(params.id),
    getSellerListings(params.id),
  ]);
  if (!seller) notFound();

  const location = [seller.village, seller.regionLabel || regionLabel(seller.region || '')]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-primary-200"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {strings.detail.back}
      </Link>

      <section className="panel mt-4 grid min-w-0 gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xl font-extrabold text-primary-700"
            aria-hidden="true"
          >
            {seller.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {strings.sellerPage.title}
            </p>
            <h1 className="text-2xl font-extrabold leading-tight text-ink">{seller.fullName}</h1>
            {location && <p className="mt-0.5 text-sm text-muted">📍 {location}</p>}
            <p className="mt-2 text-sm text-ink">
              <strong>{seller.activeListings}</strong> {strings.sellerPage.activeListings} ·{' '}
              <strong>{seller.totalListings}</strong> {strings.sellerPage.totalListings}
              {seller.memberSince && (
                <span className="text-muted">
                  {' '}
                  · {strings.sellerPage.memberSince}: {formatDate(seller.memberSince)}
                </span>
              )}
            </p>
          </div>
        </div>

        <ContactButtons
          phone={seller.phone}
          telegram={seller.telegramUsername}
          className="min-w-0 sm:min-w-[16rem]"
        />
      </section>

      <h2 className="mt-8 text-lg font-extrabold text-ink">{strings.sellerPage.listings}</h2>
      <div className="mt-3">
        <ProductGrid
          listings={listings.items}
          empty={
            <p className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-12 text-center text-muted">
              {strings.sellerPage.empty}
            </p>
          }
        />
      </div>
    </div>
  );
}
