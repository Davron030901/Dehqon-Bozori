'use client';

import Link from 'next/link';
import { CheckCircle2, ImagePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { API_URL, createListing, uploadPhoto } from '@/lib/api';
import { isValidPhone } from '@/lib/format';
import { getProfileDraft, getToken, saveListingDraft } from '@/lib/session';
import { districtsOf, isValidDistrict } from '@/lib/districts';
import { categoryLabels, primaryCategories, regions, strings } from '@/lib/strings';
import type { ListingCategory, NewListingInput } from '@/lib/types';

type FormState = {
  productName: string;
  category: ListingCategory;
  pricePerKg: string;
  quantityKg: string;
  village: string;
  district: string;
  region: string;
  harvestDate: string;
  description: string;
  phone: string;
  telegramUsername: string;
  whatsappNumber: string;
};

type Errors = Partial<Record<keyof FormState | 'contacts', string>>;

const EMPTY: FormState = {
  productName: '',
  category: 'sabzavotlar',
  pricePerKg: '',
  quantityKg: '',
  village: '',
  district: '',
  region: 'samarkand',
  harvestDate: '',
  description: '',
  phone: '',
  telegramUsername: '',
  whatsappNumber: '',
};

export default function AddListingPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Prefill location and contacts from the registration form.
  useEffect(() => {
    const draft = getProfileDraft();
    if (!draft) return;
    setForm((current) => ({
      ...current,
      village: draft.village || current.village,
      region: draft.region || current.region,
      // Only reuse the saved district if it belongs to the saved region —
      // otherwise the form opens pre-filled with an invalid pair.
      district: isValidDistrict(draft.district ?? '', draft.region || current.region)
        ? draft.district
        : current.district,
      phone: draft.phone || current.phone,
    }));
  }, []);

  // Release the object URL when the preview changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, contacts: undefined }));
  }

  /**
   * Changing the region clears the district.
   *
   * Keeping it would submit a Samarkand district under Fergana — the backend
   * rejects that with a 422, but only after the seller has filled in the whole
   * form. Clearing it makes the mistake impossible instead of catching it late.
   */
  function changeRegion(next: string) {
    setForm((current) => ({ ...current, region: next, district: '' }));
    setErrors((current) => ({ ...current, region: undefined, district: undefined }));
  }

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (form.productName.trim().length < 2) next.productName = strings.form.minLength(2);

    const price = Number.parseFloat(form.pricePerKg);
    if (!form.pricePerKg.trim()) next.pricePerKg = strings.form.required;
    else if (!Number.isFinite(price) || price <= 0) next.pricePerKg = strings.form.invalidPrice;

    if (!form.village.trim()) next.village = strings.form.required;
    if (!form.district.trim()) next.district = strings.form.required;
    // A district left over from a previously chosen region would be rejected by
    // the backend; say so here rather than after the round trip.
    else if (!isValidDistrict(form.district, form.region)) {
      next.district = strings.form.required;
    }

    if (form.phone.trim() && !isValidPhone(form.phone)) {
      next.phone = strings.form.invalidPhone;
    }
    if (form.whatsappNumber.trim() && !isValidPhone(form.whatsappNumber)) {
      next.whatsappNumber = strings.form.invalidPhone;
    }

    // The whole product depends on a buyer being able to reach the seller.
    if (!form.phone.trim() && !form.telegramUsername.trim() && !form.whatsappNumber.trim()) {
      next.contacts = strings.form.atLeastOneContact;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    const payload: NewListingInput = {
      productName: form.productName.trim(),
      category: form.category,
      pricePerKg: Number.parseFloat(form.pricePerKg),
      quantityKg: form.quantityKg ? Number.parseFloat(form.quantityKg) : undefined,
      village: form.village.trim(),
      district: form.district.trim(),
      region: form.region,
      harvestDate: form.harvestDate || undefined,
      description: form.description.trim() || undefined,
      phone: form.phone.trim() || undefined,
      telegramUsername: form.telegramUsername.trim().replace(/^@/, '') || undefined,
      whatsappNumber: form.whatsappNumber.trim() || undefined,
    };

    const token = getToken();

    if (token && API_URL) {
      try {
        if (photoFile) {
          payload.photoUrl = await uploadPhoto(token, photoFile);
        }
        const created = await createListing(token, payload);
        setCreatedId(created.id);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : strings.form.genericError);
      }
    } else {
      // No session — keep it locally so the seller does not lose their typing.
      const draft = saveListingDraft(payload);
      setCreatedId(draft.id);
      setNotice(strings.form.offlineSaved);
    }

    setSubmitting(false);
  }

  if (createdId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        <CheckCircle2 size={44} className="mx-auto text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-extrabold text-ink">
          {strings.addListing.success}
        </h1>
        {notice && (
          <p className="mt-3 rounded-xl border border-harvest/30 bg-harvest/10 px-4 py-3 text-sm text-[#8a5316]">
            {notice}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {!createdId.startsWith('draft-') && (
            <Link href={`/mahsulot/${createdId}`} className="btn-primary">
              {strings.addListing.viewListing}
            </Link>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setForm(EMPTY);
              setPhotoFile(null);
              setPhotoPreview(null);
              setCreatedId(null);
              setNotice(null);
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
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {strings.addListing.title}
      </h1>
      <p className="mt-2 text-[15px] text-muted">{strings.addListing.subtitle}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-5">
        {/* photo -------------------------------------------------------- */}
        <div>
          <span className="field-label">{strings.addListing.photo}</span>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 px-5 py-6 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
          >
            {photoPreview ? (
              <>
                {/* A local object URL cannot go through next/image optimization */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt=""
                  className="max-h-48 rounded-xl object-cover"
                />
                <span>{strings.addListing.photoChange}</span>
              </>
            ) : (
              <>
                <ImagePlus size={26} aria-hidden="true" />
                <span>{strings.addListing.photoHint}</span>
              </>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>

        {/* product ------------------------------------------------------ */}
        <div>
          <label htmlFor="productName" className="field-label">
            {strings.addListing.productName} <span className="text-red-500">*</span>
          </label>
          <input
            id="productName"
            className="field-input"
            placeholder={strings.addListing.productNamePlaceholder}
            value={form.productName}
            onChange={(event) => update('productName', event.target.value)}
            aria-invalid={Boolean(errors.productName)}
          />
          {errors.productName && <p className="field-error">{errors.productName}</p>}
        </div>

        <div>
          <span className="field-label">
            {strings.addListing.category} <span className="text-red-500">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {primaryCategories.map((key) => {
              const meta = categoryLabels[key];
              const selected = form.category === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update('category', key)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    selected
                      ? 'border-primary bg-primary text-white'
                      : 'border-sand-200 bg-white text-ink hover:border-primary-200'
                  }`}
                >
                  <span aria-hidden="true">{meta.emoji}</span> {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pricePerKg" className="field-label">
              {strings.addListing.pricePerKg} <span className="text-red-500">*</span>
            </label>
            <input
              id="pricePerKg"
              type="number"
              inputMode="numeric"
              min={1}
              step={100}
              className="field-input"
              placeholder="8000"
              value={form.pricePerKg}
              onChange={(event) => update('pricePerKg', event.target.value)}
              aria-invalid={Boolean(errors.pricePerKg)}
            />
            {errors.pricePerKg && <p className="field-error">{errors.pricePerKg}</p>}
          </div>

          <div>
            <label htmlFor="quantityKg" className="field-label">
              {strings.addListing.quantityKg}{' '}
              <span className="font-normal text-muted">({strings.form.optional})</span>
            </label>
            <input
              id="quantityKg"
              type="number"
              inputMode="numeric"
              min={0}
              className="field-input"
              placeholder="500"
              value={form.quantityKg}
              onChange={(event) => update('quantityKg', event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="village" className="field-label">
              {strings.addListing.village} <span className="text-red-500">*</span>
            </label>
            <input
              id="village"
              className="field-input"
              value={form.village}
              onChange={(event) => update('village', event.target.value)}
              aria-invalid={Boolean(errors.village)}
            />
            {errors.village && <p className="field-error">{errors.village}</p>}
          </div>

          <div>
            <label htmlFor="region" className="field-label">
              {strings.addListing.region}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {/*
              A list, not a text box. When this was free text the same place
              arrived as "Urgut", "urgut tumani" and "Urgut t.", and a buyer
              filtering by district saw a third of what was actually for sale.
            */}
            <label htmlFor="district" className="field-label">
              {strings.addListing.district} <span className="text-red-500">*</span>
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

          <div>
            <label htmlFor="harvestDate" className="field-label">
              {strings.addListing.harvestDate}{' '}
              <span className="font-normal text-muted">({strings.form.optional})</span>
            </label>
            <input
              id="harvestDate"
              type="date"
              className="field-input"
              value={form.harvestDate}
              onChange={(event) => update('harvestDate', event.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            {strings.addListing.description}{' '}
            <span className="font-normal text-muted">({strings.form.optional})</span>
          </label>
          <textarea
            id="description"
            rows={3}
            className="field-input resize-y"
            placeholder={strings.addListing.descriptionPlaceholder}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </div>

        {/* contacts ----------------------------------------------------- */}
        <fieldset className="rounded-2xl border border-sand-200 bg-white p-4">
          <legend className="px-1.5 text-sm font-bold text-ink">
            {strings.addListing.contactsTitle} <span className="text-red-500">*</span>
          </legend>
          <p className="mb-3 text-[13px] text-muted">{strings.addListing.contactsHint}</p>

          <div className="grid gap-3">
            <div>
              <label htmlFor="phone" className="field-label">
                {strings.addListing.phone}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                className="field-input"
                placeholder="+998 90 123 45 67"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="telegramUsername" className="field-label">
                {strings.addListing.telegram}
              </label>
              <input
                id="telegramUsername"
                className="field-input"
                placeholder="@username"
                value={form.telegramUsername}
                onChange={(event) => update('telegramUsername', event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="whatsappNumber" className="field-label">
                {strings.addListing.whatsapp}
              </label>
              <input
                id="whatsappNumber"
                type="tel"
                inputMode="tel"
                className="field-input"
                placeholder="+998 90 123 45 67"
                value={form.whatsappNumber}
                onChange={(event) => update('whatsappNumber', event.target.value)}
                aria-invalid={Boolean(errors.whatsappNumber)}
              />
              {errors.whatsappNumber && (
                <p className="field-error">{errors.whatsappNumber}</p>
              )}
            </div>
          </div>

          {errors.contacts && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {errors.contacts}
            </p>
          )}
        </fieldset>

        {notice && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {notice}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? strings.addListing.submitting : strings.addListing.submit}
        </button>
      </form>
    </div>
  );
}
