'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, PackageCheck, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import Badge from '@/components/Badge';
import LoginGate from '@/components/LoginGate';
import { API_URL, deleteListing, getMyListings, setListingSold } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import {
  getListingDrafts,
  getToken,
  removeListingDraft,
  updateListingDraft,
} from '@/lib/session';
import { categoryLabels, regionLabel, strings } from '@/lib/strings';
import type { Listing } from '@/lib/types';

export default function SellerCabinetPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = getToken();
    const drafts = getListingDrafts();

    if (token && API_URL) {
      try {
        const mine = await getMyListings(token);
        setSignedIn(true);
        // Local drafts sit alongside published listings until they are sent.
        setListings([...drafts, ...mine]);
        setLoading(false);
        return;
      } catch {
        /* token expired or backend down — fall through to drafts only */
      }
    }

    setSignedIn(false);
    setListings(drafts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleSold(listing: Listing) {
    setBusyId(listing.id);
    setError(null);

    if (listing.id.startsWith('draft-')) {
      updateListingDraft(listing.id, { isSoldOut: !listing.isSoldOut });
      await load();
      setBusyId(null);
      return;
    }

    const token = getToken();
    if (!token) {
      setBusyId(null);
      return;
    }

    try {
      await setListingSold(token, listing.id, !listing.isSoldOut);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
    }
    setBusyId(null);
  }

  async function remove(listing: Listing) {
    if (!window.confirm(strings.cabinet.confirmDelete(listing.productName))) return;
    setBusyId(listing.id);

    if (listing.id.startsWith('draft-')) {
      removeListingDraft(listing.id);
      await load();
      setBusyId(null);
      return;
    }

    const token = getToken();
    if (!token) {
      setBusyId(null);
      return;
    }

    try {
      await deleteListing(token, listing.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
    }
    setBusyId(null);
  }

  const activeCount = listings.filter((l) => !l.isSoldOut).length;
  const totalViews = listings.reduce((sum, l) => sum + (l.views ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {strings.cabinet.title}
      </h1>
      <p className="mt-2 text-[15px] text-muted">{strings.cabinet.subtitle}</p>

      {!loading && !signedIn && (
        <div className="mt-5">
          <LoginGate
            title={strings.cabinet.loginTitle}
            description={strings.cabinet.loginBody}
            onSignedIn={() => void load()}
          />
        </div>
      )}

      {listings.length > 0 && (
        <dl className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            { value: listings.length, label: strings.cabinet.totalListings },
            { value: activeCount, label: strings.cabinet.activeListings },
            { value: totalViews, label: strings.cabinet.views },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 shadow-sm"
            >
              <dd className="text-xl font-extrabold leading-tight text-primary-700">
                {stat.value}
              </dd>
              <dt className="text-xs text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-28 w-full" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-4xl" aria-hidden="true">
            🌱
          </p>
          <p className="mt-2 font-bold text-ink">{strings.cabinet.empty}</p>
          <Link href="/sotuvchi/elon-qoshish" className="btn-primary mt-5">
            {strings.cabinet.emptyCta}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3">
          {listings.map((listing) => {
            const meta = categoryLabels[listing.category];
            const isDraft = listing.id.startsWith('draft-');
            const busy = busyId === listing.id;

            return (
              <li
                key={listing.id}
                className="flex items-start gap-3 rounded-2xl border border-sand-200 bg-white p-3.5 shadow-card"
              >
                <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-xl bg-primary-50">
                  {listing.photoUrl ? (
                    <Image
                      src={listing.photoUrl}
                      alt={listing.productName}
                      fill
                      sizes="74px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl">
                      {meta.emoji}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink">{listing.productName}</p>
                    {listing.isSoldOut ? (
                      <Badge tone="sold">{strings.cabinet.sold}</Badge>
                    ) : (
                      <Badge tone="primary">{strings.cabinet.active}</Badge>
                    )}
                    {isDraft && <Badge tone="neutral">{strings.cabinet.unpublished}</Badge>}
                  </div>

                  <p className="font-extrabold text-primary-700">
                    {formatPrice(listing.pricePerKg)}{' '}
                    <span className="text-xs font-semibold text-muted">
                      so’m/{listing.unitLabel || strings.detail.kg}
                    </span>
                  </p>

                  <p className="text-xs text-muted">
                    📍 {regionLabel(listing.region)} · {formatDate(listing.createdAt)}
                    {listing.views ? ` · 👁 ${listing.views}` : ''}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleSold(listing)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink transition hover:border-primary-200 hover:bg-primary-50 disabled:opacity-50"
                    >
                      {listing.isSoldOut ? (
                        <>
                          <RotateCcw size={14} aria-hidden="true" />
                          {strings.cabinet.markActive}
                        </>
                      ) : (
                        <>
                          <PackageCheck size={14} aria-hidden="true" />
                          {strings.cabinet.markSold}
                        </>
                      )}
                    </button>

                    {!isDraft && (
                      <Link
                        href={`/mahsulot/${listing.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink transition hover:border-primary-200"
                      >
                        <Eye size={14} aria-hidden="true" />
                        {strings.cabinet.view}
                      </Link>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(listing)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {strings.cabinet.delete}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
