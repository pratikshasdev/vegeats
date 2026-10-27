import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Enums, Tables, TablesUpdate } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { queryKeys } from './query-client';

export type Profile = Tables<'profiles'>;

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; patch: Pick<TablesUpdate<'profiles'>, 'display_name' | 'diet_preferences' | 'avatar_url'> }) => {
      const { data, error } = await supabase.from('profiles').update(input.patch).eq('id', input.userId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.setQueryData(queryKeys.profile(data.id), data),
  });
}

type Status = Enums<'content_status'>;

export interface Contributions {
  restaurants: { id: string; name: string; status: Status; created_at: string }[];
  dishes: { id: string; name: string; status: Status; created_at: string; restaurant_id: string }[];
  photos: { id: string; kind: Enums<'photo_kind'>; status: Status; created_at: string; restaurant_id: string }[];
  reviews: { id: string; rating: number; created_at: string; restaurant_id: string; restaurants: { name: string } | null }[];
}

export function useContributions(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contributions(userId ?? ''),
    queryFn: async (): Promise<Contributions> => {
      const [r, d, p, v] = await Promise.all([
        supabase.from('restaurants').select('id, name, status, created_at').eq('created_by', userId!).order('created_at', { ascending: false }),
        supabase.from('dishes').select('id, name, status, created_at, restaurant_id').eq('created_by', userId!).order('created_at', { ascending: false }),
        supabase.from('photos').select('id, kind, status, created_at, restaurant_id').eq('user_id', userId!).order('created_at', { ascending: false }),
        supabase.from('reviews').select('id, rating, created_at, restaurant_id, restaurants(name)').eq('user_id', userId!).order('created_at', { ascending: false }),
      ]);
      for (const res of [r, d, p, v]) if (res.error) throw res.error;
      return {
        restaurants: r.data ?? [],
        dishes: d.data ?? [],
        photos: p.data ?? [],
        reviews: (v.data ?? []) as Contributions['reviews'],
      };
    },
    enabled: !!userId,
  });
}
