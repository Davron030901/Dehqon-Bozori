import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import Badge from '@/components/Badge';
import ContactButtons from '@/components/ContactButtons';
import FavoriteButton from '@/components/FavoriteButton';
import ProductCard from '@/components/ProductCard';
import ReportButton from '@/components/ReportButton';
import ShareButton from '@/components/ShareButton';
import { getListingById, getSimilarListings, isListedToday } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { categoryLabels, regionLabel, strings } from '@/lib/strings';

export const dynamic = 'force-dynamic';

type PageProps = { params: { id: string } };

/**
 * One fetch per request, shared by the metadata and the page.
 *
 * The backend counts a view on every read, and `cache: 'no-store'` stops Next
 * from de-duplicating the two calls on its own — so without this every visit
 * was counted twice, and the seller's numbers were double the truth.
 */
const loadListing = cache((id: string) => getListingById(id));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: listing } = await loadListing(params.id);
  if (!listing) return { title: strings.detail.notFoundTitle };

  const price = `${formatPrice(listing.price)} ${strings.card.currency}/${listing.unitLabel}`;
  return {
    title: `${listing.productName} — ${price}`,
    description:
      listing.description || `${listing.productName}, ${regionLabel(listing.region)}. ${price}.`,
    openGraph: listing.photoUrl ? { images: [listing.photoUrl] } : undefined,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { data: listing } = await loadListing(params.id);
  if (!listing) notFound();

  const category = categoryLabels[listing.category] ?? categoryLabels.other;
  const emoji = listing.categoryEmoji || category.emoji;
  const listedToday = isListedToday(listing.createdAt);
  // `districtLabel`, never the raw slug: "Urgut", not "urgut".
  const place = [listing.districtLabel || listing.district, listing.village]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(', ');

  const similar = await getSimilarListings(listing);
  const unitPrice = `${formatPrice(listing.price)} ${strings.card.currency}/${listing.unitLabel}`;

  const facts: { label: string; value: string }[] = [
    { label: strings.detail.price, value: unitPrice },
    ...(listing.quantity ? [{ label: strings.detail.quantity, value: listing.quantity }] : []),
    ...(listing.harvestDate
      ? [{ label: strings.detail.harvestDate, value: formatDate(listing.harvestDate) }]
      : []),
    { label: strings.detail.category, value: `${emoji} ${category.label}` },
    {
      label: strings.detail.location,
      value: [place, regionLabel(listing.region)].filter(Boolean).join(' · '),
    },
    {
      label: strings.detail.posted,
      value: `${formatDate(listing.createdAt)}${
        listing.views ? ` · ${listing.views} ${strings.detail.views}` : ''
      }`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-primary-200"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {strings.detail.back}
      </Link>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-sand-200 bg-primary-50">
          {listing.photoUrl ? (
            <Image
              src={listing.photoUrl}
              alt={listing.productName}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              priority
              className="object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-8xl"
              role="img"
              aria-label={`${category.label} — ${strings.card.noPhoto}`}
            >
              {emoji}
            </div>
          )}
        </div>

        <div className="grid min-w-0 gap-4">
          <article className="panel min-w-0">
            {(listedToday || listing.isSoldOut) && (
              <div className="mb-2.5 flex gap-2">
                {listedToday && !listing.isSoldOut && (
                  <Badge tone="today">{strings.card.listedToday}</Badge>
                )}
                {listing.isSoldOut && <Badge tone="sold">{strings.card.soldOut}</Badge>}
              </div>
            )}

            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-ink">
              {listing.productName}
            </h1>

            <p className="mt-2 text-3xl font-extrabold text-primary-700">
              {formatPrice(listing.price)}{' '}
              <span className="text-base font-semibold text-muted">
                {strings.card.currency}/{listing.unitLabel}
              </span>
            </p>

            {listing.description && (
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                {listing.description}
              </p>
            )}

            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
              {facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="font-semibold text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <FavoriteButton listingId={listing.id} variant="full" />
              <ShareButton title={listing.productName} text={unitPrice} />
            </div>

            {listing.seller && (
              <Link
                href={`/dehqon/${listing.seller.id}`}
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-sand-200 bg-sand-100 px-4 py-3 transition hover:border-primary-200"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {strings.detail.seller}
                  </p>
                  <p className="mt-0.5 truncate font-bold text-ink">{listing.seller.fullName}</p>
                  {(listing.seller.village || listing.seller.region) && (
                    <p className="truncate text-sm text-muted">
                      {[listing.seller.village, regionLabel(listing.seller.region || '')]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-primary-700">
                    {strings.detail.sellerPage}
                  </p>
                </div>
                <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
              </Link>
            )}
          </article>

          <section className="panel min-w-0">
            <h2 className="text-lg font-extrabold text-ink">{strings.detail.contactTitle}</h2>
            <ContactButtons
              listingId={listing.id}
              phone={listing.phone}
              telegram={listing.telegramUsername}
              whatsapp={listing.whatsappNumber}
              className="mt-3.5"
            />
            <p className="mt-3.5 text-[13px] leading-relaxed text-muted">
              {strings.detail.contactNote}
            </p>
            <div className="mt-3">
              <ReportButton listingId={listing.id} />
            </div>
          </section>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-9">
          <h2 className="text-lg font-extrabold text-ink">{strings.detail.similar}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((item) => (
              <ProductCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
