'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { strings } from '@/lib/strings';

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  // Keep the box in sync when the parent resets filters.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Debounce so a slow phone is not re-filtering on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft);
      }}
      className="relative"
    >
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        aria-label={strings.search.submit}
        placeholder={strings.search.placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="w-full rounded-xl border border-sand-200 bg-white py-3 pl-10 pr-10 text-[15px] shadow-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-200"
      />
      {draft && (
        <button
          type="button"
          aria-label={strings.search.clear}
          onClick={() => {
            setDraft('');
            onChange('');
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition hover:bg-sand-100 hover:text-ink"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
