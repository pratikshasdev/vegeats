import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { DIET_LEVELS, dietLevelColors } from '@/lib/tags';
import { DEFAULT_FILTERS, type FilterValues, RADIUS_OPTIONS_MILES, useFilters } from '@/stores/filters';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function FiltersSheet() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const store = useFilters();
  const myTags = usePreferences((s) => s.dietTags);
  // Edit a draft; apply on "Show results" so the list doesn't refetch on every tap.
  const [draft, setDraft] = useState<FilterValues>({
    tags: store.tags,
    dietLevels: store.dietLevels,
    openNow: store.openNow,
    radiusMiles: store.radiusMiles,
    sort: store.sort,
  });
  const set = (patch: Partial<FilterValues>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 120 }}>
        <View style={styles.head}>
          <Text variant="title">Filters</Text>
          <Button label="Reset" size="sm" variant="ghost" onPress={() => setDraft({ ...DEFAULT_FILTERS })} />
        </View>

        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text variant="subheading">Open now</Text>
            <Text variant="small" tone="muted">
              Hide places that are closed at this moment
            </Text>
          </View>
          <Switch
            accessibilityLabel="Open now"
            value={draft.openNow}
            onValueChange={(openNow) => set({ openNow })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="subheading">Type of place</Text>
          <View style={styles.wrap}>
            {DIET_LEVELS.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                selected={draft.dietLevels.includes(d.value)}
                color={dietLevelColors(d.value, colors)}
                onPress={() => set({ dietLevels: toggle(draft.dietLevels, d.value) })}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="subheading">Distance</Text>
          <View style={styles.wrap}>
            {RADIUS_OPTIONS_MILES.map((mi) => (
              <Chip key={mi} label={`${mi} mi`} selected={draft.radiusMiles === mi} onPress={() => set({ radiusMiles: mi })} />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="subheading">Sort by</Text>
          <View style={styles.wrap}>
            <Chip label="Nearest" selected={draft.sort === 'distance'} onPress={() => set({ sort: 'distance' })} />
            <Chip label="Highest rated" selected={draft.sort === 'rating'} onPress={() => set({ sort: 'rating' })} />
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <View style={styles.rowBetween}>
            <Text variant="heading">Must have</Text>
            {myTags.length > 0 && (
              <Button label="Use my diet" size="sm" variant="ghost" onPress={() => set({ tags: [...new Set([...draft.tags, ...myTags])] })} />
            )}
          </View>
          <Text variant="small" tone="muted">
            Shows places tagged with every option you pick, or that have a dish marked with all of them.
          </Text>
          <TagPicker selected={draft.tags} onToggle={(s) => set({ tags: toggle(draft.tags, s) })} />
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          testID="apply-filters"
          label="Show results"
          onPress={() => {
            store.apply(draft);
            router.back();
          }}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
