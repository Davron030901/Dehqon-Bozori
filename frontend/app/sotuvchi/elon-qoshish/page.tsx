'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import ListingForm, { type ListingFormResult, type ListingFormValues } from '@/components/ListingForm';
import LoginGate from '@/components/LoginGate';
import { API_URL, createListing, getSession, uploadPhoto } from '@/lib/api';
import { isValidDistrict } from '@/lib/districts';
import { getProfileDraft, getToken, saveListingDraft } from '@/lib/session';
import { strings } from '@/lib/strings';

type Phase = 'checking' | 'login' | 'form' | 'done';

export default function AddListingPage() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [prefill, setPrefill] = useState<Partial<ListingFormValues>>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  /**
   * Who is posting? A listing needs an owner, so with a live backend the
   * seller signs in first (one tap in Telegram). Without a backend — a demo
   * deploy — the form still works and keeps the listing in this browser.
   */
  const check = useCallback(async () => {
    const draft = getProfileDraft();
    const base: Partial<ListingFormValues> = {
      region: draft?.region || undefined,
      district:
        draft && isValidDistrict(draft.district ?? '', draft.region) ? draft.district : undefined,
      phone: draft?.phone || undefined,
    };

    if (!API_URL) {
      setPrefill(base);
      setPhase('form');
      return;
    }
    const token = getToken();
    const session = token ? await getSession(token) : null;
    if (!session) {
      setPhase('login');
      return;
    }
    setPrefill({
      ...base,
      region: session.seller.region || base.region,
      phone: session.seller.phone || base.phone,
      telegramUsername: session.seller.telegramUsername || undefined,
    });
    setPhase('form');
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  async function submit(values: ListingFormResult, photo: File | null) {
    setError(null);
    setNotice(null);
    const token = getToken();

    if (token && API_URL) {
      try {
        if (photo) {
          const uploaded = await uploadPhoto(token, photo);
          values.photoUrl = uploaded.photoUrl;
          values.photoFileId = uploaded.photoFileId;
        }
        const created = await createListing(token, values);
        setCreatedId(created.id);
        setPhase('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.form.genericError);
      }
      return;
    }

    // Demo deploy: keep it locally so the seller does not lose their typing.
    const draft = saveListingDraft(values);
    setCreatedId(draft.id);
    setNotice(strings.form.offlineSaved);
    setPhase('done');
  }

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
          {strings.addListing.title}
        </h1>
        <div className="mt-5">
          <LoginGate
            title={strings.cabinet.loginTitle}
            description={strings.addListing.loginFirst}
            onSignedIn={() => void check()}
          />
        </div>
      </div>
    );
  }

  if (phase === 'done' && createdId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        <CheckCircle2 size={44} className="mx-auto text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-extrabold text-ink">{strings.addListing.success}</h1>
        {notice && (
          <p className="mt-3 rounded-xl border border-harvest/30 bg-harvest/10 px-4 py-3 text-sm text-[#8a5316]">
            {notice}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {!createdId.startsWith('draft-') && (
            <Link href={`/mahsulot/${createdId}`} prefetch={false} className="btn-primary">
              {strings.addListing.viewListing}
            </Link>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setCreatedId(null);
              setNotice(null);
              setFormKey((k) => k + 1);
              setPhase('form');
            }}
          >
            {strings.addListing.addAnother}
          </button>
          <Link href="/sotuvchi/kabinet" className="btn-ghost">
            {strings.nav.cabinet}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{strings.addListing.title}</h1>
      <p className="mt-2 text-[15px] text-muted">{strings.addListing.subtitle}</p>
      <div className="mt-6">
        <ListingForm
          key={formKey}
          mode="create"
          initial={prefill}
          submitLabel={strings.addListing.submit}
          submittingLabel={strings.addListing.submitting}
          error={error}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
