import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { DietSticker } from '@/components/ui/diet-sticker';
import { Text } from '@/components/ui/text';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { dietTags, setDietTags, completeOnboarding } = usePreferences();
  const [step, setStep] = useState<'intro' | 'diet'>('intro');
  const [picked, setPicked] = useState<string[]>(dietTags);

  const finish = (tags: string[]) => {
    setDietTags(tags);
    completeOnboarding();
    router.replace('/');
  };

  if (step === 'intro') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.primary, paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.stickers}>
          <DietSticker level="fully_vegan" size={120} tilt={-10} />
          <View style={{ marginTop: 60, marginLeft: -24 }}>
            <DietSticker level="vegetarian" size={92} tilt={12} />
          </View>
          <View style={{ marginTop: -10, marginLeft: -18 }}>
            <DietSticker level="veg_friendly" size={72} tilt={-4} />
          </View>
        </View>
        <View style={{ gap: space.md }}>
          <Text variant="display" color={colors.onPrimary}>
            Find food that fits how you eat.
          </Text>
          <Text color={colors.onPrimary} style={{ opacity: 0.9 }}>
            Vegan and vegetarian restaurants across Michigan, with menus you can filter for allergies, Jain, sattvic and other restrictions.
          </Text>
        </View>
        <View style={{ gap: space.sm }}>
          <Button testID="welcome-start" label="Set my diet" variant="secondary" onPress={() => setStep('diet')} fullWidth />
          <Button label="Skip for now" variant="ghost" color={colors.onPrimary} onPress={() => finish([])} fullWidth />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.xl, gap: space.xl, paddingBottom: 140 }}>
        <View style={{ gap: space.xs }}>
          <Text variant="title">What do you need from a menu?</Text>
          <Text tone="muted">We’ll highlight dishes that fit. Pick everything that applies; you can change it anytime in Profile.</Text>
        </View>
        <TagPicker
          selected={picked}
          onToggle={(s) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}
          showDescriptions
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button testID="welcome-done" label={picked.length ? `Save ${picked.length} and continue` : 'Continue'} onPress={() => finish(picked)} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  stickers: { flexDirection: 'row', alignItems: 'flex-start' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
