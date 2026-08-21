'use client';

/**
 * Founder's admin panel.
 *
 * Three things, in the order they get used: see what is happening, post a
 * listing for a grower who phoned, and moderate everything already posted.
 *
 * Admin status is decided by the backend (`is_admin` on /api/auth/me, driven by
 * ADMIN_IDS) and re-checked on every request there. Nothing here is a security
 * boundary — hiding a button in a browser never is — it only avoids showing a
 * panel that would 403 on every action.
 */

import Link from 'next/link';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';

import Badge from '@/components/Badge';
import LoginGate from '@/components/LoginGate';
import {
  createAdminListing,
  deleteAdminListing,
  getAdminDashboard,
  getAdminListings,
  getSession,
  type AdminDashboard,
  type AdminKeyCount,
} from '@/lib/api';
import { districtsOf } from '@/lib/districts';
import { formatDate, formatPrice, isValidPhone } from '@/lib/format';
import { getToken } from '@/lib/session';
import {
  categoryLabels,
  primaryCategories,
  regionLabel,
  regions,
  strings,
} from '@/lib/strings';
import type { Listing, ListingCategory } from '@/lib/types';

type Tab = 'dashboard' | 'add' | 'listings';
type StatusFilter = 'all' | 'active' | 'sold';

/**
 * The dashboard counts listings by the *backend's* category slugs, which are
 * wider than the five chips the storefront shows (honey, meat, seedlings…).
 * Translating them here keeps the analytics honest instead of folding
 * everything into "boshqa" the way the buyer-facing grid has to.
 */
const BACKEND_CATEGORY_LABELS: Record<string, string> = {
  vegetables: 'Sabzavotlar',
  fruits: 'Mevalar',
  melons: 'Poliz mahsulotlari',
  greens: 'Ko’katlar',
  grains: 'Don va dukkaklilar',
  dried: 'Quruq meva va yong’oq',
  dairy: 'Sut mahsulotlari',
  meat: 'Go’sht va parranda',
  honey: 'Asal',
  seedlings: 'Urug’ va ko’chat',
  other: 'Boshqa',
};

const EMPTY_FORM = {
  sellerName: '',
  sellerPhone: '',
  productName: '',
  category: 'sabzavotlar' as ListingCategory,
  pricePerKg: '',
  quantityKg: '',
  region: 'samarkand',
  district: '',
  description: '',
};

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');

  const checkSession = useCallback(async () => {
    setChecking(true);
    const token = getToken();
    if (!token) {
      setSignedIn(false);
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    const session = await getSession(token);
    setSignedIn(Boolean(session));
    setIsAdmin(Boolean(session?.isAdmin));
    setChecking(false);
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (checking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton mt-4 h-40 w-full" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {strings.admin.title}
        </h1>
        <div className="mt-5">
          <LoginGate
            title={strings.admin.loginTitle}
            description={strings.admin.loginBody}
            onSignedIn={() => void checkSession()}
          />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {strings.admin.notAdminTitle}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {strings.admin.notAdminBody}
        </p>
        <Link href="/" className="btn-ghost mt-5 inline-flex">
          {strings.nav.home}
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: strings.admin.tabDashboard },
    { key: 'add', label: strings.admin.tabAdd },
    { key: 'listings', label: strings.admin.tabListings },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {strings.admin.title}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {strings.admin.subtitle}
      </p>

      <div
        role="tablist"
        aria-label={strings.admin.title}
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === item.key
                ? 'border-primary bg-primary text-white'
                : 'border-sand-200 bg-white text-ink hover:border-primary-200 hover:bg-primary-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'add' && <AddListingTab />}
        {tab === 'listings' && <ListingsTab />}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- //
//  Dashboard
// --------------------------------------------------------------------------- //
function DashboardTab() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminDashboard(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-3">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const cards = [
    { value: data.totals.listings, label: strings.admin.statListings },
    { value: data.totals.active, label: strings.admin.statActive },
    { value: data.totals.sold, label: strings.admin.statSold },
    { value: data.totals.users, label: strings.admin.statUsers },
    { value: data.totals.contacts, label: strings.admin.statContacts },
    { value: data.totals.contactsWeek, label: strings.admin.statContactsWeek },
    { value: data.totals.listingsWeek, label: strings.admin.statListingsWeek },
  ];

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink transition hover:border-primary-200"
        >
          <RefreshCw size={14} aria-hidden="true" />
          {strings.admin.reload}
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 shadow-sm"
          >
            <dd className="text-xl font-extrabold leading-tight text-primary-700">
              {card.value}
            </dd>
            <dt className="text-xs text-muted">{card.label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Breakdown
          title={strings.admin.byCategory}
          rows={data.byCategory}
          labelFor={(key) => BACKEND_CATEGORY_LABELS[key] ?? key}
        />
        <Breakdown
          title={strings.admin.byRegion}
          rows={data.byRegion}
          labelFor={(key) => regionLabel(key)}
        />
        <Breakdown title={strings.admin.bySource} rows={data.bySource} />
        <Breakdown title={strings.admin.byChannel} rows={data.byChannel} />
      </div>

      {data.topListings.length > 0 && (
        <section className="mt-5 rounded-2xl border border-sand-200 bg-white p-4 shadow-card">
          <h2 className="font-bold text-ink">{strings.admin.topListings}</h2>
          <ul className="mt-2.5 grid gap-1.5">
            {data.topListings.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <Link
                  href={`/mahsulot/${item.id}`}
                  className="truncate text-ink hover:text-primary-700"
                >
                  {item.title}
                </Link>
                <span className="shrink-0 text-xs font-semibold text-muted">
                  👁 {item.views}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Breakdown({
  title,
  rows,
  labelFor,
}: {
  title: string;
  rows: AdminKeyCount[];
  labelFor?: (key: string) => string;
}) {
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0) || 1;

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-4 shadow-card">
      <h2 className="font-bold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">—</p>
      ) : (
        <ul className="mt-2.5 grid gap-2">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-ink">
                  {labelFor ? labelFor(row.key) : row.key}
                </span>
                <span className="shrink-0 font-semibold text-muted">{row.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand-200">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// --------------------------------------------------------------------------- //
//  Add a listing on behalf of a grower
// --------------------------------------------------------------------------- //
function AddListingTab() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generic over the key so `category` stays a ListingCategory instead of
  // widening to string the moment a <select> writes into it.
  function update<K extends keyof typeof EMPTY_FORM>(
    field: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Clearing the district on a region change stops the form submitting a pair
  // the backend will reject — Urgut filed under Fergana.
  function changeRegion(next: string) {
    setForm((prev) => ({ ...prev, region: next, district: '' }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.sellerPhone.trim()) next.sellerPhone = strings.form.required;
    else if (!isValidPhone(form.sellerPhone)) next.sellerPhone = strings.form.invalidPhone;
    if (form.productName.trim().length < 2) next.productName = strings.form.minLength(2);
    const price = Number(form.pricePerKg);
    if (!form.pricePerKg.trim() || !Number.isFinite(price) || price <= 0) {
      next.pricePerKg = strings.form.invalidPrice;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    const token = getToken();
    if (!token) {
      setError(strings.form.genericError);
      return;
    }

    setSaving(true);
    try {
      const listing = await createAdminListing(token, {
        sellerName: form.sellerName.trim() || undefined,
        sellerPhone: form.sellerPhone.trim(),
        productName: form.productName.trim(),
        category: form.category,
        pricePerKg: Number(form.pricePerKg),
        quantityKg: form.quantityKg ? Number(form.quantityKg) : undefined,
        village: form.district.trim(),
        district: form.district.trim(),
        region: form.region,
        description: form.description.trim() || undefined,
        phone: form.sellerPhone.trim(),
      });
      setCreated(listing);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
    }
    setSaving(false);
  }

  if (created) {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
        <p className="text-4xl" aria-hidden="true">
          🌿
        </p>
        <p className="mt-2 text-lg font-extrabold text-primary-800">
          {strings.admin.success}
        </p>
        <p className="mt-1 text-sm text-primary-700">
          {created.productName} · {formatPrice(created.pricePerKg)} so’m/kg
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Link href={`/mahsulot/${created.id}`} className="btn-primary">
            {strings.addListing.viewListing}
          </Link>
          <button type="button" onClick={() => setCreated(null)} className="btn-ghost">
            {strings.admin.addAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <fieldset className="rounded-2xl border border-sand-200 bg-white p-4 shadow-card">
        <legend className="px-1 text-sm font-bold text-ink">
          {strings.admin.sellerSection}
        </legend>
        <p className="text-xs leading-relaxed text-muted">{strings.admin.sellerHint}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label={strings.admin.sellerPhone}
            error={errors.sellerPhone}
            required
          >
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
              type="text"
              value={form.sellerName}
              onChange={(e) => update('sellerName', e.target.value)}
              placeholder={strings.admin.sellerNamePlaceholder}
              className="field-input"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-sand-200 bg-white p-4 shadow-card">
        <legend className="px-1 text-sm font-bold text-ink">
          {strings.admin.productSection}
        </legend>

        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          <Field
            label={strings.addListing.productName}
            error={errors.productName}
            required
          >
            <input
              type="text"
              value={form.productName}
              onChange={(e) => update('productName', e.target.value)}
              placeholder={strings.addListing.productNamePlaceholder}
              className="field-input"
            />
          </Field>

          <Field label={strings.addListing.category}>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value as ListingCategory)}
              className="field-input"
            >
              {[...primaryCategories, 'boshqa' as const].map((key) => (
                <option key={key} value={key}>
                  {categoryLabels[key].emoji} {categoryLabels[key].label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={strings.addListing.pricePerKg}
            error={errors.pricePerKg}
            required
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={form.pricePerKg}
              onChange={(e) => update('pricePerKg', e.target.value)}
              className="field-input"
            />
          </Field>

          <Field label={strings.addListing.quantityKg}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.quantityKg}
              onChange={(e) => update('quantityKg', e.target.value)}
              className="field-input"
            />
          </Field>

          <Field label={strings.addListing.region}>
            <select
              value={form.region}
              onChange={(e) => changeRegion(e.target.value)}
              className="field-input"
            >
              {regions.map((region) => (
                <option key={region.key} value={region.key}>
                  {region.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={strings.addListing.district}>
            <select
              value={form.district}
              onChange={(e) => update('district', e.target.value)}
              className="field-input"
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

        <div className="mt-3">
          <Field label={strings.addListing.description}>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder={strings.addListing.descriptionPlaceholder}
              className="field-input"
            />
          </Field>
        </div>
      </fieldset>

      {error && <ErrorNote message={error} />}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? strings.admin.submitting : strings.admin.submit}
      </button>
    </form>
  );
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
      <span className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-red-600"> *</span>}
        {!required && (
          <span className="ml-1 text-xs font-normal text-muted">
            ({strings.form.optional})
          </span>
        )}
      </span>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

// --------------------------------------------------------------------------- //
//  All listings — moderation
// --------------------------------------------------------------------------- //
function ListingsTab() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setListings(
        await getAdminListings(token, {
          query: query.trim() || undefined,
          status: status === 'all' ? undefined : status,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
    }
    setLoading(false);
  }, [query, status]);

  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per keystroke.
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function remove(listing: Listing) {
    if (!window.confirm(strings.admin.confirmDelete(listing.productName))) return;
    const token = getToken();
    if (!token) return;
    setBusyId(listing.id);
    try {
      await deleteAdminListing(token, listing.id);
      setListings((prev) => prev.filter((item) => item.id !== listing.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.form.genericError);
    }
    setBusyId(null);
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: strings.admin.filterAll },
    { key: 'active', label: strings.admin.filterActive },
    { key: 'sold', label: strings.admin.filterSold },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={strings.admin.searchPlaceholder}
          className="field-input min-w-[200px] flex-1"
        />
        <div className="flex gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatus(item.key)}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                status === item.key
                  ? 'border-primary bg-primary text-white'
                  : 'border-sand-200 bg-white text-ink hover:border-primary-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote message={error} />
        </div>
      )}

      {loading ? (
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-12 text-center text-muted">
          {strings.admin.empty}
        </p>
      ) : (
        <ul className="mt-4 grid gap-2.5">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-3.5 shadow-card"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/mahsulot/${listing.id}`}
                    className="font-bold text-ink hover:text-primary-700"
                  >
                    {listing.productName}
                  </Link>
                  {listing.isSoldOut ? (
                    <Badge tone="sold">{strings.cabinet.sold}</Badge>
                  ) : (
                    <Badge tone="primary">{strings.cabinet.active}</Badge>
                  )}
                </div>
                <p className="font-extrabold text-primary-700">
                  {formatPrice(listing.pricePerKg)}{' '}
                  <span className="text-xs font-semibold text-muted">
                    so’m/{listing.unitLabel || strings.detail.kg}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {strings.admin.seller}: {listing.seller?.fullName ?? '—'}
                  {listing.phone ? ` · ${listing.phone}` : ''}
                </p>
                <p className="text-xs text-muted">
                  📍 {regionLabel(listing.region)} · {formatDate(listing.createdAt)}
                  {listing.views ? ` · 👁 ${listing.views}` : ''}
                </p>
              </div>

              <button
                type="button"
                disabled={busyId === listing.id}
                onClick={() => void remove(listing)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={14} aria-hidden="true" />
                {strings.admin.delete}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}
