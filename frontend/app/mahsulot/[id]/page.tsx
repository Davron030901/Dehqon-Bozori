import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import Badge from '@/components/Badge';
import ContactButtons from '@/components/ContactButtons';
import ProductCard from '@/components/ProductCard';
import { getListingById, getListings, isListedToday } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { categoryLabels, regionLabel, strings } from '@/lib/strings';

export const dynamic = 'force-dynamic';

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: listing } = await getListingById(params.id);
  if (!listing) return { title: strings.detail.notFoundTitle };

  return {
    title: `${listing.productName} — ${formatPrice(listing.pricePerKg)} so’m`,
    description:
      listing.description ||
      `${listing.productName}, ${regionLabel(listing.region)}. ${formatPrice(listing.pricePerKg)} so’m/${listing.unitLabel || strings.detail.kg}.`,
    openGraph: listing.photoUrl ? { images: [listing.photoUrl] } : undefined,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { data: listing } = await getListingById(params.id);
  if (!listing) notFound();

  const category = categoryLabels[listing.category];
  const listedToday = isListedToday(listing.createdAt);
  const place = [listing.village, listing.district]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(', ');

  // "More like this" — same category, excluding the listing being viewed.
  const { data: all } = await getListings();
  const similar = all
    .filter((item) => item.category === listing.category && item.id !== listing.id)
    .slice(0, 4);

  const facts: { label: string; value: string }[] = [
    {
      label: strings.detail.price,
      value: `${formatPrice(listing.pricePerKg)} so’m/${listing.unitLabel || strings.detail.kg}`,
    },
    ...(listing.quantityKg
      ? [{ label: strings.detail.quantity, value: `${formatPrice(listing.quantityKg)} ${listing.unitLabel || strings.detail.kg}` }]
      : []),
    ...(listing.harvestDate
      ? [{ label: strings.detail.harvestDate, value: formatDate(listing.harvestDate) }]
      : []),
    { label: strings.detail.category, value: `${category.emoji} ${category.label}` },
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
              {category.emoji}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <article className="panel">
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
              {formatPrice(listing.pricePerKg)}{' '}
              <span className="text-base font-semibold text-muted">
                so’m/{listing.unitLabel || strings.detail.kg}
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

            {listing.seller && (
              <div className="mt-5 rounded-xl border border-sand-200 bg-sand-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {strings.detail.seller}
                </p>
                <p className="mt-0.5 font-bold text-ink">{listing.seller.fullName}</p>
                {(listing.seller.village || listing.seller.region) && (
                  <p className="text-sm text-muted">
                    {[listing.seller.village, regionLabel(listing.seller.region || '')]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            )}
          </article>

          <section className="panel">
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
