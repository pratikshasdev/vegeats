import { StyleSheet, View } from 'react-native';

import { CATEGORY_LABELS, CATEGORY_ORDER, tagColors, tagsByCategory, type TagCategory } from '@/lib/tags';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

import { Chip } from './ui/chip';
import { Text } from './ui/text';

export function TagPicker({
  selected,
  onToggle,
  categories = CATEGORY_ORDER,
  showDescriptions = false,
}: {
  selected: string[];
  onToggle: (slug: string) => void;
  categories?: TagCategory[];
  showDescriptions?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xl }}>
      {categories.map((cat) => (
        <View key={cat} style={{ gap: space.sm }}>
          <Text variant="subheading" accessibilityRole="header">
            {CATEGORY_LABELS[cat]}
          </Text>
          <View style={styles.wrap}>
            {tagsByCategory(cat).map((t) => (
              <Chip
                key={t.slug}
                testID={`tag-${t.slug}`}
                label={t.label}
                selected={selected.includes(t.slug)}
                color={tagColors(t.slug, colors)}
                onPress={() => onToggle(t.slug)}
              />
            ))}
          </View>
          {showDescriptions && cat === 'religious' && (
            <Text variant="caption" tone="muted">
              Jain excludes root vegetables such as onion, garlic, potato and carrot. Sattvic excludes onion and garlic.
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm } });
