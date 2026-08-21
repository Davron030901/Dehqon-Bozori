'use client';

import Link from 'next/link';
import { CheckCircle2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { API_URL, getMe, updateProfile } from '@/lib/api';
import { isValidPhone } from '@/lib/format';
import { getProfileDraft, getToken, saveProfileDraft } from '@/lib/session';
import { districtsOf, isValidDistrict } from '@/lib/districts';
import { regions, strings } from '@/lib/strings';
import type { SellerRegistrationInput } from '@/lib/types';

type Errors = Partial<Record<keyof SellerRegistrationInput, string>>;

const EMPTY: SellerRegistrationInput = {
  fullName: '',
  phone: '',
  village: '',
  district: '',
  region: 'samarkand',
};

export default function SellerRegistrationPage() {
  const [form, setForm] = useState<SellerRegistrationInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState('');

  // Prefill from a previous visit, or from the Telegram account if signed in.
  useEffect(() => {
    setBotUsername(process.env.NEXT_PUBLIC_BOT_USERNAME || '');

    const draft = getProfileDraft();
    if (draft) setForm((current) => ({ ...current, ...draft }));

    const token = getToken();
    if (!token || !API_URL) return;
    void getMe(token).then((seller) => {
      if (!seller) return;
      setForm((current) => ({
        ...current,
        fullName: seller.fullName || current.fullName,
        phone: seller.phone || current.phone,
        village: seller.village || current.village,
        region: seller.region || current.region,
      }));
    });
  }, []);

  function update<K extends keyof SellerRegistrationInput>(
    key: K,
    value: SellerRegistrationInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  // Districts belong to exactly one region, so switching region invalidates
  // whatever was chosen. Clearing it beats submitting an impossible pair.
  function changeRegion(next: string) {
    setForm((current) => ({ ...current, region: next, district: '' }));
    setErrors((current) => ({ ...current, region: undefined, district: undefined }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (form.fullName.trim().length < 2) next.fullName = strings.form.minLength(2);
    if (!form.phone.trim()) next.phone = strings.form.required;
    else if (!isValidPhone(form.phone)) next.phone = strings.form.invalidPhone;
    if (!form.village.trim()) next.village = strings.form.required;
    if (!form.district.trim()) next.district = strings.form.required;
    else if (!isValidDistrict(form.district, form.region)) {
      // Left over from a region the seller changed away from.
      next.district = strings.form.required;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setNotice(null);

    // Always keep a local copy so the add-listing form can prefill.
    saveProfileDraft(form);

    const token = getToken();
    if (token && API_URL) {
      try {
        await updateProfile(token, form);
        setDone(true);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : strings.form.genericError);
      }
    } else {
      // No backend session yet — saved locally, and we say so plainly.
      setNotice(strings.form.offlineSaved);
      setDone(true);
    }

    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        <CheckCircle2 size={44} className="mx-auto text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-extrabold text-ink">{strings.register.success}</h1>
        {notice && (
          <p className="mt-3 rounded-xl border border-harvest/30 bg-harvest/10 px-4 py-3 text-sm text-[#8a5316]">
            {notice}
          </p>
        )}
        <Link href="/sotuvchi/elon-qoshish" className="btn-primary mt-6">
          {strings.register.goAddListing}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {strings.register.title}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {strings.register.subtitle}
      </p>

      {botUsername && (
        <a
          href={`https://t.me/${botUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-start gap-3 rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/10 px-4 py-3 text-sm text-[#12668a] transition hover:bg-[#229ED9]/15"
        >
          <Send size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{strings.register.telegramHint}</span>
        </a>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
        <div>
          <label htmlFor="fullName" className="field-label">
            {strings.register.fullName} <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            className="field-input"
            placeholder={strings.register.fullNamePlaceholder}
            value={form.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && <p className="field-error">{errors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="field-label">
            {strings.register.phone} <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="field-input"
            placeholder="+998 90 123 45 67"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <p className="field-error">{errors.phone}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="village" className="field-label">
              {strings.register.village} <span className="text-red-500">*</span>
            </label>
            <input
              id="village"
              className="field-input"
              placeholder={strings.register.villagePlaceholder}
              value={form.village}
              onChange={(event) => update('village', event.target.value)}
              aria-invalid={Boolean(errors.village)}
            />
            {errors.village && <p className="field-error">{errors.village}</p>}
          </div>

          <div>
            <label htmlFor="region" className="field-label">
              {strings.register.region}
            </label>
            <select
              id="region"
              className="field-input"
              value={form.region}
              onChange={(event) => changeRegion(event.target.value)}
            >
              {regions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          {/* Same list the bot offers, so a seller who registers here and then
              posts from Telegram is filed under the same district both times. */}
          <label htmlFor="district" className="field-label">
            {strings.register.district} <span className="text-red-500">*</span>
          </label>
          <select
            id="district"
            className="field-input"
            value={form.district}
            onChange={(event) => update('district', event.target.value)}
            aria-invalid={Boolean(errors.district)}
          >
            <option value="">{strings.register.districtChoose}</option>
            {districtsOf(form.region).map((option) => (
              <option key={option.key} value={option.key}>
                {option.type === 'city' ? `🏙 ${option.label}` : option.label}
              </option>
            ))}
          </select>
          {errors.district && <p className="field-error">{errors.district}</p>}
        </div>

        {notice && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {notice}
          </p>
        )}

        <button type="submit" className="btn-primary mt-1" disabled={submitting}>
          {submitting ? strings.register.submitting : strings.register.submit}
        </button>
      </form>
    </div>
  );
}
