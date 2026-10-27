import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Enums } from '@/lib/database.types';

export type DietLevel = Enums<'diet_level'>;
export type SortOption = 'distance' | 'rating';

export interface FilterValues {
  tags: string[];
  dietLevels: DietLevel[];
  openNow: boolean;
  radiusMiles: number;
  sort: SortOption;
}

interface FiltersState extends FilterValues {
  query: string;
  setQuery: (q: string) => void;
  toggleTag: (tag: string) => void;
  toggleDietLevel: (level: DietLevel) => void;
  setOpenNow: (v: boolean) => void;
  setRadiusMiles: (mi: number) => void;
  setSort: (s: SortOption) => void;
  apply: (values: Partial<FilterValues>) => void;
  reset: () => void;
}

export const DEFAULT_FILTERS: FilterValues = {
  tags: [],
  dietLevels: [],
  openNow: false,
  radiusMiles: 15,
  sort: 'distance',
};

export const RADIUS_OPTIONS_MILES = [3, 5, 15, 30, 60] as const;
export const METERS_PER_MILE = 1609.344;

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export const useFilters = create<FiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_FILTERS,
      query: '',
      setQuery: (query) => set({ query }),
      toggleTag: (tag) => set((s) => ({ tags: toggle(s.tags, tag) })),
      toggleDietLevel: (level) => set((s) => ({ dietLevels: toggle(s.dietLevels, level) })),
      setOpenNow: (openNow) => set({ openNow }),
      setRadiusMiles: (radiusMiles) => set({ radiusMiles }),
      setSort: (sort) => set({ sort }),
      apply: (values) => set(values),
      reset: () => set({ ...DEFAULT_FILTERS }),
    }),
    {
      name: 'vegeats-filters',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: ({ tags, dietLevels, openNow, radiusMiles, sort }) => ({ tags, dietLevels, openNow, radiusMiles, sort }),
    },
  ),
);

export function activeFilterCount(f: FilterValues): number {
  return (
    f.tags.length +
    f.dietLevels.length +
    (f.openNow ? 1 : 0) +
    (f.radiusMiles !== DEFAULT_FILTERS.radiusMiles ? 1 : 0) +
    (f.sort !== DEFAULT_FILTERS.sort ? 1 : 0)
  );
}
