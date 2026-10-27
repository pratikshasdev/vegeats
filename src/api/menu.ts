import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { queryKeys } from './query-client';

export type Dish = Tables<'dishes'>;

export interface MenuSection {
  category: string;
  dishes: Dish[];
}

/** Groups dishes by category, keeping the first-seen category order and each dish's sort_order. */
export function groupMenu(dishes: Dish[]): MenuSection[] {
  const sections = new Map<string, Dish[]>();
  for (const d of [...dishes].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))) {
    const list = sections.get(d.category) ?? [];
    list.push(d);
    sections.set(d.category, list);
  }
  return [...sections.entries()].map(([category, list]) => ({ category, dishes: list }));
}

export function useDishes(restaurantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dishes(restaurantId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

export interface SubmitDishInput {
  restaurantId: string;
  name: string;
  description?: string;
  category: string;
  priceCents: number | null;
  tags: string[];
}

export function useSubmitDish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitDishInput) => {
      const { data, error } = await supabase
        .from('dishes')
        .insert({
          restaurant_id: input.restaurantId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category.trim() || 'Mains',
          price_cents: input.priceCents,
          tags: input.tags,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.dishes(input.restaurantId) });
      qc.invalidateQueries({ queryKey: ['contributions'] });
      qc.invalidateQueries({ queryKey: queryKeys.moderation });
    },
  });
}

export const SUGGESTED_CATEGORIES = ['Starters', 'Mains', 'Bowls', 'Sandwiches', 'Sides', 'Desserts', 'Drinks'];
