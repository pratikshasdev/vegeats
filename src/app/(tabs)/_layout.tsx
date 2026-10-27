import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const onboarded = usePreferences((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/welcome" />;

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.primaryTint}
      tintColor={colors.primary}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} md="eco" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
