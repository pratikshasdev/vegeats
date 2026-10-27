import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

export const queryKeys = {
  search: (params: unknown) => ['restaurants', 'search', params] as const,
  restaurant: (id: string) => ['restaurants', 'detail', id] as const,
  dishes: (restaurantId: string) => ['dishes', restaurantId] as const,
  reviews: (restaurantId: string) => ['reviews', restaurantId] as const,
  photos: (restaurantId: string) => ['photos', restaurantId] as const,
  profile: (userId: string) => ['profile', userId] as const,
  myReview: (restaurantId: string, userId: string) => ['reviews', restaurantId, 'mine', userId] as const,
  contributions: (userId: string) => ['contributions', userId] as const,
  moderation: ['moderation'] as const,
};

/** Turn Supabase/Postgres errors into a sentence a person can act on. */
export function friendlyError(error: unknown): string {
  const e = error as { message?: string; code?: string } | null;
  const msg = e?.message ?? String(error);
  if (e?.code === '23505') return 'You already did that. Edit your existing entry instead.';
  if (e?.code === '42501' || /row-level security/i.test(msg)) return 'Sign in to do this.';
  if (/Unknown tag/i.test(msg)) return 'One of the selected tags is not recognized. Update the app and try again.';
  if (/network|fetch failed|Failed to fetch/i.test(msg)) return 'No connection. Check your internet and try again.';
  return msg || 'Something went wrong. Try again.';
}
