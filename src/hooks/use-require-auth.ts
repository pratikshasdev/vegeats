import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/providers/auth-provider';

/** Run `action` if signed in; otherwise open sign-in with a reason. */
export function useRequireAuth() {
  const { user } = useAuth();
  return useCallback(
    (action: () => void, reason = 'Sign in to contribute') => {
      if (user) action();
      else router.push({ pathname: '/sign-in', params: { reason } });
    },
    [user],
  );
}
