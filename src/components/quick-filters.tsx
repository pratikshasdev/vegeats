import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { tagColors, tagLabel } from '@/lib/tags';
import { activeFilterCount, useFilters } from '@/stores/filters';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

import { Chip } from './ui/chip';

// Shown after the user's own diet tags.
const POPULAR = ['vegan', 'vegetarian', 'gluten_free', 'jain', 'nut_free', 'halal_veg'];

export function QuickFilters() {
  const { colors } = useTheme();
  const filters = useFilters();
  const myTags = usePreferences((s) => s.dietTags);
  const quick = [...new Set([...myTags, ...POPULAR])].slice(0, 8);
  const count = activeFilterCount(filters);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip
        testID="open-filters"
        label="Filters"
        icon="options-outline"
        badge={count}
        selected={count > 0}
        onPress={() => router.push('/filters')}
      />
      <Chip label="Open now" selected={filters.openNow} onPress={() => filters.setOpenNow(!filters.openNow)} />
      {quick.map((t) => (
        <Chip
          key={t}
          testID={`quick-${t}`}
          label={tagLabel(t)}
          selected={filters.tags.includes(t)}
          color={tagColors(t, colors)}
          onPress={() => filters.toggleTag(t)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs },
});
