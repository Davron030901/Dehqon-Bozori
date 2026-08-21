import Link from 'next/link';

import AutoRefresh from '@/components/AutoRefresh';
import HomeFeed from '@/components/HomeFeed';
import { getListings, getStats } from '@/lib/api';
import { strings } from '@/lib/strings';

// Listings change all day long — never serve a stale bazaar.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [{ data: listings, isDemo }, { data: stats }] = await Promise.all([
    getListings(),
    getStats(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* A trader keeps this page open all morning; new produce should arrive
          on its own. Skipped when the demo data is showing, since it never
          changes and refreshing it would only burn the buyer's data. */}
      {!isDemo && <AutoRefresh seconds={30} />}

      <section className="pt-7">
        <h1 className="max-w-2xl text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
          {strings.home.heroTitle}
        </h1>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">
          {strings.home.heroSubtitle}
        </p>

        <dl className="mt-5 flex flex-wrap gap-2.5">
          {[
            { value: stats.activeListings, label: strings.home.statListings },
            { value: stats.sellers, label: strings.home.statSellers },
            { value: stats.regions, label: strings.home.statRegions },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-sand-200 bg-white px-3.5 py-2 shadow-sm"
            >
              <dd className="text-lg font-extrabold leading-tight text-primary-700">
                {stat.value}
              </dd>
              <dt className="text-xs text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>

        {isDemo && (
          <p className="mt-4 rounded-xl border border-harvest/30 bg-harvest/10 px-4 py-3 text-sm text-[#8a5316]">
            {strings.home.demoNotice}
          </p>
        )}
      </section>

      <HomeFeed listings={listings} />

      <section className="mb-8 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-6 text-center">
        <p className="text-lg font-extrabold text-primary-800">
          Hosilingiz bormi? O’zingiz soting.
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-primary-700">
          Bir daqiqada e’lon joylang — xaridor sizga to’g’ridan-to’g’ri qo’ng’iroq qiladi.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Link href="/sotuvchi/elon-qoshish" className="btn-primary">
            {strings.nav.sell}
          </Link>
          <Link href="/sotuvchi/royxatdan-otish" className="btn-ghost">
            {strings.nav.register}
          </Link>
        </div>
      </section>
    </div>
  );
}
