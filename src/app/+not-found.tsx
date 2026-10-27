import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/feedback';
import { useTheme } from '@/theme/theme';

export default function NotFound() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <EmptyState icon="compass-outline" title="This page doesn't exist" actionLabel="Back to Discover" onAction={() => router.replace('/')} />
    </View>
  );
}
