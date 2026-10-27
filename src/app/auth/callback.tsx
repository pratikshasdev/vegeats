import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { friendlyError } from '@/api/query-client';
import { EmptyState } from '@/components/ui/feedback';
import { completeOAuthRedirect } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme';

/** Landing route for email confirmation, password reset and OAuth deep links (vegeats://auth/callback). */
export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    completeOAuthRedirect(url)
      .then(() => router.replace('/profile'))
      .catch((e) => setError(friendlyError(e)));
  }, [url]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      {error ? (
        <EmptyState icon="alert-circle-outline" title="That link didn't work" body={`${error} Request a new link and try again.`} actionLabel="Go to sign in" onAction={() => router.replace('/sign-in')} />
      ) : (
        <ActivityIndicator color={colors.primary} size="large" />
      )}
    </View>
  );
}
