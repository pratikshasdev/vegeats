import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Enums, Tables } from '@/lib/database.types';
import { PHOTOS_BUCKET, publicPhotoUrl, supabase } from '@/lib/supabase';

import { queryKeys } from './query-client';

export type Photo = Tables<'photos'> & { url: string };
export type PhotoKind = Enums<'photo_kind'>;

export const PHOTO_KIND_LABELS: Record<PhotoKind, string> = {
  menu: 'Menu page',
  dish: 'A dish',
  place: 'The place',
};

const MAX_EDGE = 1600;

export function usePhotos(restaurantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.photos(restaurantId ?? ''),
    queryFn: async (): Promise<Photo[]> => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data.map((p) => ({ ...p, url: publicPhotoUrl(p.storage_path) }));
    },
    enabled: !!restaurantId,
  });
}

/** Resize to a sensible max edge and re-encode as JPEG before upload. */
export async function prepareImage(uri: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    ctx.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

export interface UploadPhotoInput {
  restaurantId: string;
  userId: string;
  kind: PhotoKind;
  caption?: string;
  dishId?: string | null;
  image: { uri: string; width: number; height: number };
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadPhotoInput) => {
      const localUri = await prepareImage(input.image.uri, input.image.width, input.image.height);
      const body = await (await fetch(localUri)).arrayBuffer();
      const path = `${input.userId}/${input.restaurantId}/${Crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, body, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('photos').insert({
        restaurant_id: input.restaurantId,
        user_id: input.userId,
        dish_id: input.dishId ?? null,
        kind: input.kind,
        caption: input.caption?.trim() || null,
        storage_path: path,
      });
      if (error) {
        // Don't leave an orphaned file behind.
        await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
        throw error;
      }
      return path;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.photos(input.restaurantId) });
      qc.invalidateQueries({ queryKey: ['contributions'] });
      qc.invalidateQueries({ queryKey: queryKeys.moderation });
    },
  });
}
