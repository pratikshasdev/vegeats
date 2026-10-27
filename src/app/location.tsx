import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MICHIGAN_PLACES, useSearchOrigin } from '@/hooks/use-location';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

export default function LocationSheet() {
  const { colors } = useTheme();
  const { origin, permission, locating, locateMe, chooseCity } = useSearchOrigin();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Text variant="title">Search near</Text>
      <Button
        label={locating ? 'Finding you…' : 'Use my current location'}
        icon="navigate"
        loading={locating}
        onPress={async () => {
          const p = await locateMe();
          if (p) router.back();
        }}
        fullWidth
      />
      {permission === 'denied' && (
        <View style={{ gap: space.xs }}>
          <Text variant="small" tone="muted">
            Location is turned off for VegEats. Pick a city below, or allow location in Settings.
          </Text>
          <Button label="Open Settings" size="sm" variant="ghost" onPress={() => Linking.openSettings()} />
        </View>
      )}
      <Text variant="subheading">Michigan cities</Text>
      <View style={{ gap: space.xs }}>
        {MICHIGAN_PLACES.map((p) => {
          const active = origin.source === 'manual' && origin.label === p.label;
          return (
            <Pressable
              key={p.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                chooseCity(p);
                router.back();
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: active ? colors.primaryTint : pressed ? colors.surfaceRaised : colors.surface, borderColor: colors.border },
              ]}>
              <Text variant={active ? 'bodyStrong' : 'body'}>{p.label}</Text>
              {active && <Icon name="checkmark" color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
