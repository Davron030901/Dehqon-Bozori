'use client';

import { Flag } from 'lucide-react';
import { useState } from 'react';

import { reportListing } from '@/lib/api';
import { getToken } from '@/lib/session';
import { reportReasons, strings } from '@/lib/strings';
import type { ReportReason } from '@/lib/types';

const REASONS = Object.keys(reportReasons) as ReportReason[];

/**
 * "Shikoyat qilish" — flag a listing for the founder.
 *
 * Anonymous, like everything a buyer does here. The backend rate-limits it and
 * sends the admins a Telegram message straight away.
 */
export default function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState('sending');
    setError(null);
    try {
      await reportListing(listingId, reason, note, getToken());
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <p className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
        {strings.report.thanks}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-red-600"
      >
        <Flag size={14} aria-hidden="true" />
        {strings.detail.report}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sand-200 bg-sand-100 p-4">
      <p className="font-bold text-ink">{strings.report.title}</p>
      <fieldset className="mt-3 grid gap-2">
        <legend className="sr-only">{strings.report.reason}</legend>
        {REASONS.map((key) => (
          <label key={key} className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="radio"
              name="report-reason"
              value={key}
              checked={reason === key}
              onChange={() => setReason(key)}
              className="h-4 w-4 accent-primary"
            />
            {reportReasons[key]}
          </label>
        ))}
      </fieldset>
      <label className="mt-3 block">
        <span className="sr-only">{strings.report.note}</span>
        <textarea
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={strings.report.notePlaceholder}
          className="field-input resize-y text-sm"
        />
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={state === 'sending'}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {state === 'sending' ? strings.report.sending : strings.report.submit}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink"
        >
          {strings.report.cancel}
        </button>
      </div>
    </div>
  );
}
