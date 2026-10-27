import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useUpdateProfile } from '@/api/profile';
import { friendlyError } from '@/api/query-client';
import { FormScreen } from '@/components/form-screen';
import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/providers/auth-provider';
import { usePreferences } from '@/stores/preferences';
import { space } from '@/theme/tokens';

export default function DietPreferencesScreen() {
  const { user, refreshProfile } = useAuth();
  const { dietTags, setDietTags } = usePreferences();
  const update = useUpdateProfile();
  const [picked, setPicked] = useState(dietTags);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      if (user) {
        await update.mutateAsync({ userId: user.id, patch: { diet_preferences: picked } });
        await refreshProfile();
      }
      setDietTags(picked);
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <FormScreen footer={<Button testID="save-diet" label="Save" onPress={save} loading={update.isPending} fullWidth />}>
      <View style={{ gap: space.xs }}>
        <Text tone="muted">
          Dishes matching all of these get a “Fits your diet” mark.{user ? ' Saved to your account.' : ' Saved on this device. Sign in to keep it across devices.'}
        </Text>
      </View>
      <TagPicker selected={picked} onToggle={(s) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))} showDescriptions />
      {error && <ErrorBanner message={error} />}
    </FormScreen>
  );
}
