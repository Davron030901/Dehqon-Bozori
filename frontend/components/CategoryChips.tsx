'use client';

import { categoryLabels, categoryOrder, strings } from '@/lib/strings';
import type { CategoryKey } from '@/lib/types';

export type CategoryValue = CategoryKey | 'all';

/**
 * The eleven categories the bot offers, as a scrollable chip row.
 *
 * With `counts`, a category nobody is selling today is hidden — a chip that
 * leads to an empty page teaches a buyer the site is empty. The selected one
 * always stays, so the buyer can see what is filtering their results.
 */
export default function CategoryChips({
  value,
  onChange,
  counts,
}: {
  value: CategoryValue;
  onChange: (next: CategoryValue) => void;
  counts?: Record<string, number>;
}) {
  const visible = categoryOrder.filter(
    (key) => !counts || (counts[key] ?? 0) > 0 || key === value,
  );
  const options: CategoryValue[] = ['all', ...visible];

  return (
    <div
      role="tablist"
      aria-label={strings.filters.allCategories}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = value === option;
        const meta = option === 'all' ? null : categoryLabels[option];
        const count = option === 'all' || !counts ? undefined : counts[option];
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selected
                ? 'border-primary bg-primary text-white'
                : 'border-sand-200 bg-white text-ink hover:border-primary-200 hover:bg-primary-50'
            }`}
          >
            {meta ? (
              <>
                <span aria-hidden="true">{meta.emoji}</span> {meta.short}
                {count ? (
                  <span className={`ml-1.5 text-xs ${selected ? 'text-white/80' : 'text-muted'}`}>
                    {count}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <span aria-hidden="true">🧺</span> {strings.filters.allCategories}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
