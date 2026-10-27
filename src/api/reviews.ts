import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { queryKeys } from './query-client';

export type Review = Tables<'reviews'> & {
  profiles: Pick<Tables<'profiles'>, 'display_name' | 'avatar_url'> | null;
};

export function useReviews(restaurantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviews(restaurantId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles(display_name, avatar_url)')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!restaurantId,
  });
}

export function useMyReview(restaurantId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myReview(restaurantId ?? '', userId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && !!userId,
  });
}

function invalidateReviewQueries(qc: ReturnType<typeof useQueryClient>, restaurantId: string) {
  qc.invalidateQueries({ queryKey: ['reviews', restaurantId] });
  qc.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) });
  qc.invalidateQueries({ queryKey: ['restaurants', 'search'] });
  qc.invalidateQueries({ queryKey: ['contributions'] });
}

export function useSaveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { restaurantId: string; userId: string; rating: number; body: string }) => {
      if (input.rating < 1 || input.rating > 5) throw new Error('Choose a rating from 1 to 5 stars.');
      const { data, error } = await supabase
        .from('reviews')
        .upsert(
          {
            restaurant_id: input.restaurantId,
            user_id: input.userId,
            rating: input.rating,
            body: input.body.trim() || null,
          },
          { onConflict: 'restaurant_id,user_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, input) => invalidateReviewQueries(qc, input.restaurantId),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; restaurantId: string }) => {
      const { error } = await supabase.from('reviews').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, input) => invalidateReviewQueries(qc, input.restaurantId),
  });
}
