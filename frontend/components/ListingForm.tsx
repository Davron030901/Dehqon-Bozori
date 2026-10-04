'use client';

import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { districtsOf, isValidDistrict } from '@/lib/districts';
import { isValidPhone, parsePrice } from '@/lib/format';
import {
  categoryLabels,
  categoryOrder,
  regions,
  strings,
  unitLabels,
  unitOrder,
} from '@/lib/strings';
import type { CategoryKey, NewListingInput, UnitKey } from '@/lib/types';

/** What the form edits. Numbers stay strings until submit, as inputs give them. */
export interface ListingFormValues {
  productName: string;
  category: CategoryKey;
  price: string;
  unit: UnitKey;
  quantity: string;
  region: string;
  district: string;
  harvestDate: string;
  description: string;
  phone: string;
  telegramUsername: string;
  whatsappNumber: string;
  sellerName: string;
  sellerPhone: string;
}

export const EMPTY_LISTING_FORM: ListingFormValues = {
  productName: '',
  category: 'vegetables',
  price: '',
  unit: 'kg',
  quantity: '',
  region: 'samarkand',
  district: '',
  harvestDate: '',
  description: '',
  phone: '',
  telegramUsername: '',
  whatsappNumber: '',
  sellerName: '',
  sellerPhone: '',
};

export interface ListingFormResult extends NewListingInput {
  sellerName?: string;
  sellerPhone?: string;
}

type Errors = Partial<Record<keyof ListingFormValues | 'contacts', string>>;

/**
 * One listing form for every place a listing is written from the browser:
 * a seller posting (`create`), a seller fixing a typo (`edit`), and the founder
 * posting for a grower who phoned (`admin`). They used to be two copies that
 * had already drifted apart — one asked for a village it never sent.
 *
 * The same eleven categories and seven units as the bot, so a listing looks the
 * same whichever door it came in through.
 */
export default function ListingForm({
  mode,
  initial,
  initialPhotoUrl,
  submitLabel,
  submittingLabel,
  error,
  onSubmit,
}: {
  mode: 'create' | 'edit' | 'admin';
  initial?: Partial<ListingFormValues>;
  /** The listing's current photo, shown until a new one is picked. */
  initialPhotoUrl?: string;
  submitLabel: string;
  submittingLabel: string;
  error?: string | null;
  onSubmit: (values: ListingFormResult, photo: File | null) => Promise<void>;
}) {
  // Missing profile data arrives as `undefined`; spreading that over the
  // defaults would leave a field without a string and break `.trim()` on submit.
  const [form, setForm] = useState<ListingFormValues>(() => ({
    ...EMPTY_LISTING_FORM,
    ...definedValues(initial),
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Fields the person has changed by hand. Profile data arrives after the
  // first render (it is read from the API) and may fill in anything else — but
  // never overwrite what someone already typed or picked.
  const touched = useRef(new Set<keyof ListingFormValues>());

  useEffect(() => {
    if (!initial) return;
    setForm((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(initial) as [keyof ListingFormValues, string][]) {
        if (value && !touched.current.has(key)) (next as Record<string, string>)[key] = value;
      }
      // A remembered district only makes sense inside the remembered region.
      if (next.district && !isValidDistrict(next.district, next.region)) next.district = '';
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial)]);

  // Release the object URL when the preview changes or the form unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function update<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    touched.current.add(key);
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
    touched.current.add('region');
    touched.current.add('district');
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

    const price = parsePrice(form.price);
    if (!form.price.trim()) next.price = strings.form.required;
    else if (!Number.isFinite(price) || price <= 0) next.price = strings.form.invalidPrice;

    if (mode !== 'admin' && !form.district) next.district = strings.form.required;
    // A district left over from a previously chosen region would be rejected
    // by the backend; say so here rather than after the round trip.
    if (form.district && !isValidDistrict(form.district, form.region)) {
      next.district = strings.form.required;
    }

    for (const key of ['phone', 'whatsappNumber', 'sellerPhone'] as const) {
      if (form[key].trim() && !isValidPhone(form[key])) next[key] = strings.form.invalidPhone;
    }

    if (mode === 'admin') {
      if (!form.sellerPhone.trim()) next.sellerPhone = strings.form.required;
    } else if (
      // The whole product depends on a buyer being able to reach the seller.
      !form.phone.trim() &&
      !form.telegramUsername.trim() &&
      !form.whatsappNumber.trim()
    ) {
      next.contacts = strings.form.atLeastOneContact;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        {
          productName: form.productName.trim(),
          category: form.category,
          price: parsePrice(form.price),
          unit: form.unit,
          quantity: form.quantity.trim() || undefined,
          region: form.region,
          district: form.district,
          harvestDate: form.harvestDate || undefined,
          description: form.description.trim() || undefined,
          phone: form.phone.trim() || undefined,
          telegramUsername: form.telegramUsername.trim().replace(/^@/, '') || undefined,
          whatsappNumber: form.whatsappNumber.trim() || undefined,
          sellerName: form.sellerName.trim() || undefined,
          sellerPhone: form.sellerPhone.trim() || undefined,
        },
        photoFile,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const shownPhoto = photoPreview || initialPhotoUrl;
  const unit = unitLabels[form.unit];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      {mode === 'admin' && (
        <fieldset className="rounded-2xl border border-sand-200 bg-white p-4 shadow-card">
          <legend className="px-1 text-sm font-bold text-ink">{strings.admin.sellerSection}</legend>
          <p className="text-xs leading-relaxed text-muted">{strings.admin.sellerHint}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label={strings.admin.sellerPhone} error={errors.sellerPhone} required>
              <input
                type="tel"
                inputMode="tel"
                value={form.sellerPhone}
                onChange={(e) => update('sellerPhone', e.target.value)}
                placeholder="+998 90 123 45 67"
                className="field-input"
              />
            </Field>
            <Field label={strings.admin.sellerName}>
              <input
                value={form.sellerName}
                onChange={(e) => update('sellerName', e.target.value)}
                placeholder={strings.admin.sellerNamePlaceholder}
                className="field-input"
              />
            </Field>
          </div>
        </fieldset>
      )}

      {/* photo -------------------------------------------------------------- */}
      <div>
        <span className="field-label">{strings.addListing.photo}</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 px-5 py-6 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
          >
            {shownPhoto ? (
              <>
                {/* A local object URL cannot go through next/image optimization */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shownPhoto} alt="" className="max-h-48 rounded-xl object-cover" />
                <span>{strings.addListing.photoChange}</span>
              </>
            ) : (
              <>
                <ImagePlus size={26} aria-hidden="true" />
                <span>{strings.addListing.photoHint}</span>
              </>
            )}
          </button>
          {photoPreview && (
            <button
              type="button"
              aria-label={strings.addListing.removePhoto}
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
              className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-muted shadow-sm hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />
      </div>

      {/* product ------------------------------------------------------------ */}
      <Field label={strings.addListing.productName} error={errors.productName} required>
        <input
          value={form.productName}
          onChange={(e) => update('productName', e.target.value)}
          placeholder={strings.addListing.productNamePlaceholder}
          maxLength={100}
          className="field-input"
          aria-invalid={Boolean(errors.productName)}
        />
      </Field>

      <div>
        <span className="field-label">
          {strings.addListing.category} <span className="text-red-500">*</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {categoryOrder.map((key) => {
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

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label={strings.addListing.pricePer(unit)} error={errors.price} required>
          {/* Text, not type=number: "8 000" is how people write a price, and a
              number input silently turns it into an empty value. */}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            placeholder="8000"
            className="field-input"
            aria-invalid={Boolean(errors.price)}
          />
        </Field>
        <Field label={strings.addListing.unit} required>
          <select
            value={form.unit}
            onChange={(e) => update('unit', e.target.value as UnitKey)}
            className="field-input"
          >
            {unitOrder.map((key) => (
              <option key={key} value={key}>
                {unitLabels[key]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${strings.addListing.quantity} (${unit})`} error={errors.quantity}>
          {/* Free text, like the bot: "3 tonna" and "500-600" are real answers. */}
          <input
            type="text"
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            placeholder={strings.addListing.quantityPlaceholder}
            maxLength={50}
            className="field-input"
          />
        </Field>
        <Field label={strings.addListing.harvestDate}>
          <input
            type="date"
            value={form.harvestDate}
            onChange={(e) => update('harvestDate', e.target.value)}
            className="field-input"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={strings.addListing.region} required>
          <select
            value={form.region}
            onChange={(e) => changeRegion(e.target.value)}
            className="field-input"
          >
            {regions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {/*
          A list, not a text box. When this was free text the same place
          arrived as "Urgut", "urgut tumani" and "Urgut t.", and a buyer
          filtering by district saw a third of what was actually for sale.
        */}
        <Field
          label={strings.addListing.district}
          error={errors.district}
          required={mode !== 'admin'}
        >
          <select
            value={form.district}
            onChange={(e) => update('district', e.target.value)}
            className="field-input"
            aria-invalid={Boolean(errors.district)}
          >
            <option value="">{strings.register.districtChoose}</option>
            {districtsOf(form.region).map((option) => (
              <option key={option.key} value={option.key}>
                {option.type === 'city' ? `🏙 ${option.label}` : option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={strings.addListing.description}>
        <textarea
          rows={3}
          maxLength={1000}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder={strings.addListing.descriptionPlaceholder}
          className="field-input resize-y"
        />
      </Field>

      {/* contacts ----------------------------------------------------------- */}
      <fieldset className="rounded-2xl border border-sand-200 bg-white p-4">
        <legend className="px-1.5 text-sm font-bold text-ink">
          {strings.addListing.contactsTitle}
          {mode !== 'admin' && <span className="text-red-500"> *</span>}
        </legend>
        {mode !== 'admin' && (
          <p className="mb-3 text-[13px] text-muted">{strings.addListing.contactsHint}</p>
        )}
        <div className="grid gap-3">
          <Field label={strings.addListing.phone} error={errors.phone}>
            <input
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+998 90 123 45 67"
              className="field-input"
            />
          </Field>
          <Field label={strings.addListing.telegram}>
            <input
              value={form.telegramUsername}
              onChange={(e) => update('telegramUsername', e.target.value)}
              placeholder="@username"
              className="field-input"
            />
          </Field>
          <Field label={strings.addListing.whatsapp} error={errors.whatsappNumber}>
            <input
              type="tel"
              inputMode="tel"
              value={form.whatsappNumber}
              onChange={(e) => update('whatsappNumber', e.target.value)}
              placeholder="+998 90 123 45 67"
              className="field-input"
            />
          </Field>
        </div>
        {errors.contacts && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {errors.contacts}
          </p>
        )}
      </fieldset>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}

/** Drop keys whose value is missing, so they keep the form's '' default. */
function definedValues(values: Partial<ListingFormValues> | undefined): Partial<ListingFormValues> {
  return Object.fromEntries(
    Object.entries(values ?? {}).filter(([, value]) => value !== undefined && value !== null),
  ) as Partial<ListingFormValues>;
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required ? (
          <span className="text-red-500"> *</span>
        ) : (
          <span className="ml-1 text-xs font-normal text-muted">({strings.form.optional})</span>
        )}
      </span>
      {children}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}
