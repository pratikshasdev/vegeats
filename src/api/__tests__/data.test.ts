jest.mock('@/lib/supabase', () => ({ supabase: {}, publicPhotoUrl: (p: string) => `https://cdn/${p}` }));

import type { Dish } from '../menu';
import { groupMenu } from '../menu';
import { friendlyError } from '../query-client';
import { reasonsFor } from '../reports';
import { refineResults, type RestaurantSummary } from '../restaurants';
import { activeFilterCount, DEFAULT_FILTERS, useFilters } from '@/stores/filters';

const base: Omit<RestaurantSummary, 'id' | 'name' | 'distance_m' | 'rating_avg' | 'rating_count' | 'external_rating'> = {
  address_line: '1 Main',
  city: 'Ann Arbor',
  cover_photo_url: '',
  cuisines: [],
  description: '',
  diet_level: 'fully_vegan',
  external_rating_count: 0,
  hours: { wed: [['11:00', '14:00']] },
  lat: 0,
  lng: 0,
  postal_code: '',
  price_level: 1,
  region: 'MI',
  tags: [],
  timezone: 'America/Detroit',
};

const rows: RestaurantSummary[] = [
  { ...base, id: 'a', name: 'Near, unrated', distance_m: 100, rating_avg: 0, rating_count: 0, external_rating: 0 },
  { ...base, id: 'b', name: 'Far, great', distance_m: 9000, rating_avg: 4.8, rating_count: 10, external_rating: 0 },
  { ...base, id: 'c', name: 'Mid, web rated', distance_m: 3000, rating_avg: 0, rating_count: 0, external_rating: 4.2, hours: null as never },
];

describe('refineResults', () => {
  it('keeps server distance order by default', () => {
    expect(refineResults(rows, DEFAULT_FILTERS).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by VegEats rating, then web rating', () => {
    expect(refineResults(rows, { ...DEFAULT_FILTERS, sort: 'rating' }).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('filters to places open right now', () => {
    const wedNoon = new Date('2026-10-28T12:00:00-04:00');
    const out = refineResults(rows, { ...DEFAULT_FILTERS, openNow: true }, wedNoon).map((r) => r.id);
    expect(out).toEqual(['a', 'b']); // c has no hours, so it's excluded
  });
});

describe('groupMenu', () => {
  const dish = (id: string, category: string, sort_order: number, name = id): Dish => ({
    id,
    category,
    sort_order,
    name,
    created_at: '',
    created_by: null,
    description: null,
    photo_url: null,
    price_cents: null,
    restaurant_id: 'r',
    status: 'approved',
    tags: [],
    updated_at: '',
  });

  it('groups by category in sort order', () => {
    const sections = groupMenu([dish('3', 'Mains', 2), dish('1', 'Starters', 0), dish('2', 'Mains', 1), dish('4', 'Starters', 0, '0-first')]);
    expect(sections.map((s) => s.category)).toEqual(['Starters', 'Mains']);
    expect(sections[0].dishes.map((d) => d.id)).toEqual(['4', '1']);
    expect(sections[1].dishes.map((d) => d.id)).toEqual(['2', '3']);
  });
});

describe('filters store', () => {
  beforeEach(() => useFilters.getState().reset());

  it('toggles and counts active filters', () => {
    const s = useFilters.getState();
    s.toggleTag('vegan');
    s.toggleTag('gluten_free');
    s.toggleTag('vegan');
    s.toggleDietLevel('vegetarian');
    s.setOpenNow(true);
    s.setRadiusMiles(30);
    const now = useFilters.getState();
    expect(now.tags).toEqual(['gluten_free']);
    expect(activeFilterCount(now)).toBe(4);
    now.reset();
    expect(activeFilterCount(useFilters.getState())).toBe(0);
  });
});

describe('friendlyError', () => {
  it('maps common failures to plain language', () => {
    expect(friendlyError({ code: '23505', message: 'duplicate key' })).toMatch(/already/);
    expect(friendlyError({ message: 'new row violates row-level security policy' })).toBe('Sign in to do this.');
    expect(friendlyError(new Error('TypeError: Failed to fetch'))).toMatch(/No connection/);
    expect(friendlyError({ message: 'Custom message' })).toBe('Custom message');
  });
});

describe('report reasons', () => {
  it('only offers relevant reasons per target', () => {
    expect(reasonsFor('review').map((r) => r.value)).toEqual(['inappropriate', 'other']);
    expect(reasonsFor('restaurant').map((r) => r.value)).toContain('permanently_closed');
  });
});
