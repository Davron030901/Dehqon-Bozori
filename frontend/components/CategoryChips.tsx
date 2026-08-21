'use client';

import { categoryLabels, primaryCategories, strings } from '@/lib/strings';
import type { ListingCategory } from '@/lib/types';

export type CategoryValue = ListingCategory | 'all';

export default function CategoryChips({
  value,
  onChange,
  /** Show the "Boshqa" bucket — only useful when such listings exist. */
  showOther = false,
}: {
  value: CategoryValue;
  onChange: (next: CategoryValue) => void;
  showOther?: boolean;
}) {
  const options: CategoryValue[] = [
    'all',
    ...primaryCategories,
    ...(showOther ? (['boshqa'] as CategoryValue[]) : []),
  ];

  return (
    <div
      role="tablist"
      aria-label={strings.filters.allCategories}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = value === option;
        const meta = option === 'all' ? null : categoryLabels[option];
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
                <span aria-hidden="true">{meta.emoji}</span> {meta.label}
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
