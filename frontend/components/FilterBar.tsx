'use client';

import { ArrowUpDown, Building2, MapPin, RotateCcw } from 'lucide-react';

import { strings } from '@/lib/strings';
import type { SortKey } from '@/lib/types';

export interface FilterOption {
  key: string;
  label: string;
  count?: number;
}

const SORTS: SortKey[] = ['newest', 'cheapest', 'expensive', 'popular'];

export default function FilterBar({
  region,
  onRegionChange,
  district,
  onDistrictChange,
  availableDistricts,
  sort,
  onSortChange,
  onReset,
  availableRegions,
  isDirty,
}: {
  region: string;
  onRegionChange: (next: string) => void;
  district: string;
  onDistrictChange: (next: string) => void;
  /**
   * Districts that actually have listings in the selected region.
   *
   * Empty while "all regions" is selected: a flat list of 206 districts is not
   * a filter, it is a wall, and the buyer has no way to know which of them has
   * anything for sale.
   */
  availableDistricts: FilterOption[];
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
  onReset: () => void;
  /** Only regions that actually have listings — avoids dead-end filters. */
  availableRegions: FilterOption[];
  isDirty: boolean;
}) {
  const selectClass =
    'w-full appearance-none rounded-xl border border-sand-200 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-ink shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-200';
  const withCount = (option: FilterOption) =>
    option.count ? `${option.label} (${option.count})` : option.label;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[10.5rem] flex-1 sm:max-w-[15rem]">
        <MapPin
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <select
          aria-label={strings.filters.region}
          value={region}
          onChange={(event) => onRegionChange(event.target.value)}
          className={selectClass}
        >
          <option value="all">{strings.filters.allRegions}</option>
          {availableRegions.map((option) => (
            <option key={option.key} value={option.key}>
              {withCount(option)}
            </option>
          ))}
        </select>
      </div>

      {availableDistricts.length > 0 && (
        <div className="relative min-w-[10.5rem] flex-1 sm:max-w-[15rem]">
          <Building2
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <select
            aria-label={strings.filters.district}
            value={district}
            onChange={(event) => onDistrictChange(event.target.value)}
            className={selectClass}
          >
            <option value="all">{strings.filters.allDistricts}</option>
            {availableDistricts.map((option) => (
              <option key={option.key} value={option.key}>
                {withCount(option)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative min-w-[10.5rem] flex-1 sm:max-w-[13rem]">
        <ArrowUpDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <select
          aria-label={strings.filters.sort}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          className={selectClass}
        >
          {SORTS.map((key) => (
            <option key={key} value={key}>
              {strings.sort[key]}
            </option>
          ))}
        </select>
      </div>

      {isDirty && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-primary-200 hover:text-ink"
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span className="hidden sm:inline">{strings.filters.reset}</span>
        </button>
      )}
    </div>
  );
}
