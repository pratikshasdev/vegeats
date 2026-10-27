import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Enums, Tables } from '@/lib/database.types';
import { publicPhotoUrl, supabase } from '@/lib/supabase';

import { queryKeys } from './query-client';

type Status = Enums<'content_status'>;

export interface ModerationQueue {
  restaurants: (Tables<'restaurants'> & { lat: number; lng: number })[];
  dishes: (Tables<'dishes'> & { restaurants: { name: string } | null })[];
  photos: (Tables<'photos'> & { url: string; restaurants: { name: string } | null })[];
  reports: Tables<'reports'>[];
}

export function useModerationQueue(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.moderation,
    enabled,
    queryFn: async (): Promise<ModerationQueue> => {
      const [r, d, p, rep] = await Promise.all([
        supabase.from('restaurants').select('*, lat, lng').eq('status', 'pending').order('created_at'),
        supabase.from('dishes').select('*, restaurants(name)').eq('status', 'pending').order('created_at'),
        supabase.from('photos').select('*, restaurants(name)').eq('status', 'pending').order('created_at'),
        supabase.from('reports').select('*').eq('status', 'open').order('created_at'),
      ]);
      for (const res of [r, d, p, rep]) if (res.error) throw res.error;
      return {
        restaurants: (r.data ?? []) as unknown as ModerationQueue['restaurants'],
        dishes: (d.data ?? []) as ModerationQueue['dishes'],
        photos: (p.data ?? []).map((x) => ({ ...x, url: publicPhotoUrl(x.storage_path) })) as ModerationQueue['photos'],
        reports: rep.data ?? [],
      };
    },
  });
}

type Moderatable = 'restaurants' | 'dishes' | 'photos';

export function useModerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { table: Moderatable; id: string; status: Exclude<Status, 'pending'> }) => {
      const { error } = await supabase.from(input.table).update({ status: input.status }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.moderation });
      qc.invalidateQueries({ queryKey: ['restaurants'] });
      qc.invalidateQueries({ queryKey: ['dishes'] });
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; adminId: string; status: 'resolved' | 'dismissed' }) => {
      const { error } = await supabase
        .from('reports')
        .update({ status: input.status, resolved_by: input.adminId, resolved_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.moderation }),
  });
}
