import Link from 'next/link';

import { strings } from '@/lib/strings';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-5xl" aria-hidden="true">
        🌾
      </p>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">
        {strings.detail.notFoundTitle}
      </h1>
      <p className="mt-1.5 text-[15px] text-muted">{strings.detail.notFoundBody}</p>
      <Link href="/" className="btn-primary mt-6">
        {strings.nav.home}
      </Link>
    </div>
  );
}
