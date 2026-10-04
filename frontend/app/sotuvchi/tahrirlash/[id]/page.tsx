'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import ListingForm, { type ListingFormResult, type ListingFormValues } from '@/components/ListingForm';
import LoginGate from '@/components/LoginGate';
import { getListingById, getSession, updateListing, uploadPhoto } from '@/lib/api';
import { editableQuantity } from '@/lib/format';
import { getToken } from '@/lib/session';
import { strings, unitLabels } from '@/lib/strings';
import type { Listing } from '@/lib/types';

type Phase = 'checking' | 'login' | 'missing' | 'form';

/** "500 kg" on a kg listing -> "500"; "3 tonna" stays "3 tonna", not "3". */
function startQuantity(listing: Listing): string {
  return editableQuantity(listing.quantity, [unitLabels[listing.unit] ?? listing.unit]);
}

/**
 * Edit a listing — every field, not just the price.
 *
 * The backend decides who may edit (the owner, or an admin); this page only
 * avoids showing a form whose save button would come back 403.
 */
export default function EditListingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    const session = token ? await getSession(token) : null;
    if (!session) {
      setPhase('login');
      return;
    }
    // Opening the edit form is not a buyer viewing the listing.
    const { data } = await getListingById(params.id, { countView: false });
    if (!data || (data.seller?.id !== session.seller.id && !session.isAdmin)) {
      setPhase('missing');
      return;
    }
    setListing(data);
    setPhase('form');
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(values: ListingFormResult, photo: File | null) {
    const token = getToken();
    if (!token || !listing) return;
    setError(null);
    try {
      if (photo) {
        const uploaded = await uploadPhoto(token, photo);
        values.photoUrl = uploaded.photoUrl;
        values.photoFileId = uploaded.photoFileId;
      }
      // An untouched quantity under an unchanged unit is not sent: a bare "500"
      // from the bot must not turn into "500 kg" just because the price was
      // edited. A new unit re-sends it, so "500 kg" becomes "500 litr".
      const patch: Partial<ListingFormResult> = { ...values };
      if (values.unit === listing.unit && (values.quantity ?? '') === startQuantity(listing)) {
        delete patch.quantity;
      }
      await updateListing(token, listing.id, patch);
      router.push('/sotuvchi/kabinet');
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
    }
  }

  const back = (
    <Link
      href="/sotuvchi/kabinet"
      className="inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-primary-200"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {strings.editListing.back}
    </Link>
  );

  if (phase === 'checking') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton mt-4 h-64 w-full" />
      </div>
    );
  }

  if (phase === 'login') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {strings.editListing.title}
        </h1>
        <div className="mt-5">
          <LoginGate
            title={strings.cabinet.loginTitle}
            description={strings.cabinet.loginBody}
            onSignedIn={() => void load()}
          />
        </div>
      </div>
    );
  }

  if (phase === 'missing' || !listing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        {back}
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {strings.editListing.notYours}
        </p>
      </div>
    );
  }

  const initial: Partial<ListingFormValues> = {
    productName: listing.productName,
    category: listing.category,
    price: String(listing.price),
    unit: listing.unit,
    quantity: startQuantity(listing),
    region: listing.region,
    district: listing.district,
    harvestDate: listing.harvestDate,
    description: listing.description ?? '',
    phone: listing.phone ?? '',
    telegramUsername: listing.telegramUsername ?? '',
    whatsappNumber: listing.whatsappNumber ?? '',
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {back}
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
        {strings.editListing.title}
      </h1>
      <p className="mt-2 text-[15px] text-muted">{strings.editListing.subtitle}</p>
      <div className="mt-6">
        <ListingForm
          mode="edit"
          initial={initial}
          initialPhotoUrl={listing.photoUrl}
          submitLabel={strings.editListing.submit}
          submittingLabel={strings.addListing.submitting}
          error={error}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
