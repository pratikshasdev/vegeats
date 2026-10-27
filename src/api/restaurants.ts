import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Database, Tables } from '@/lib/database.types';
import { openState } from '@/lib/hours';
import { supabase } from '@/lib/supabase';
import type { DietLevel, FilterValues } from '@/stores/filters';

import { queryKeys } from './query-client';

export type RestaurantSummary = Database['public']['Functions']['search_restaurants']['Returns'][number];
export type Restaurant = Tables<'restaurants'> & { lat: number; lng: number };

export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface SearchParams {
  lat: number;
  lng: number;
  query: string;
  filters: FilterValues;
  bounds?: Bounds | null;
  limit?: number;
}

/** Client-side refinements that depend on "now" or on ordering. */
export function refineResults(rows: RestaurantSummary[], filters: FilterValues, now: Date = new Date()) {
  let out = rows;
  if (filters.openNow) out = out.filter((r) => openState(r.hours, r.timezone, now).kind === 'open');
  if (filters.sort === 'rating') {
    const score = (r: RestaurantSummary) =>
      r.rating_count > 0 ? Number(r.rating_avg) : r.external_rating ? Number(r.external_rating) : 0;
    out = [...out].sort((a, b) => score(b) - score(a) || a.distance_m - b.distance_m);
  }
  return out;
}

export async function searchRestaurants(p: SearchParams): Promise<RestaurantSummary[]> {
  const { data, error } = await supabase.rpc('search_restaurants', {
    p_lat: p.lat,
    p_lng: p.lng,
    p_radius_m: p.filters.radiusMiles * 1609.344,
    p_tags: p.filters.tags,
    p_diet_levels: p.filters.dietLevels.length ? (p.filters.dietLevels as DietLevel[]) : undefined,
    p_query: p.query.trim() || undefined,
    p_min_lat: p.bounds?.minLat,
    p_min_lng: p.bounds?.minLng,
    p_max_lat: p.bounds?.maxLat,
    p_max_lng: p.bounds?.maxLng,
    p_limit: p.limit ?? 100,
  });
  if (error) throw error;
  return data ?? [];
}

export function useRestaurantSearch(params: SearchParams | null) {
  return useQuery({
    queryKey: queryKeys.search(params),
    queryFn: () => searchRestaurants(params!),
    enabled: params !== null,
    placeholderData: keepPreviousData,
    select: (rows) => refineResults(rows, params!.filters),
  });
}

export async function fetchRestaurant(id: string): Promise<Restaurant> {
  const { data, error } = await supabase.from('restaurants').select('*, lat, lng').eq('id', id).single();
  if (error) throw error;
  return data as unknown as Restaurant;
}

export function useRestaurant(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.restaurant(id ?? ''),
    queryFn: () => fetchRestaurant(id!),
    enabled: !!id,
  });
}

export interface SubmitRestaurantInput {
  name: string;
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  lat: number;
  lng: number;
  dietLevel: DietLevel;
  tags: string[];
  cuisines: string[];
  description?: string;
  phone?: string;
  website?: string;
}

export function useSubmitRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitRestaurantInput) => {
      const { data, error } = await supabase.rpc('submit_restaurant', {
        p_name: input.name,
        p_address_line: input.addressLine,
        p_city: input.city,
        p_region: input.region,
        p_postal_code: input.postalCode,
        p_lat: input.lat,
        p_lng: input.lng,
        p_diet_level: input.dietLevel,
        p_tags: input.tags,
        p_cuisines: input.cuisines,
        p_description: input.description || undefined,
        p_phone: input.phone || undefined,
        p_website: input.website || undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contributions'] });
      qc.invalidateQueries({ queryKey: queryKeys.moderation });
    },
  });
}
