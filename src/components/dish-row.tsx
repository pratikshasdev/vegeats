import { StyleSheet, View } from 'react-native';

import type { Dish } from '@/api/menu';
import { formatPrice } from '@/lib/format';
import { missingTags, satisfies, tagColors, tagLabel } from '@/lib/tags';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

import { TagPill } from './ui/chip';
import { Icon } from './ui/icon';
import { Text } from './ui/text';

export function DishRow({ dish, wanted }: { dish: Dish; wanted: string[] }) {
  const { colors } = useTheme();
  const hasPrefs = wanted.length > 0;
  const match = hasPrefs && satisfies(dish.tags, wanted);
  const missing = hasPrefs ? missingTags(dish.tags, wanted) : [];

  return (
    <View
      testID={`dish-${dish.id}`}
      style={[
        styles.row,
        { borderColor: colors.border },
        match && { borderColor: colors.primary, backgroundColor: colors.primaryTint },
      ]}
      accessible
      accessibilityLabel={[
        dish.name,
        formatPrice(dish.price_cents),
        dish.description,
        match ? 'Fits your diet' : missing.length ? `Not marked ${missing.map(tagLabel).join(', ')}` : '',
        dish.status === 'pending' ? 'Pending review' : '',
      ]
        .filter(Boolean)
        .join('. ')}>
      <View style={styles.top}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {dish.name}
        </Text>
        {dish.price_cents != null && <Text variant="bodyStrong">{formatPrice(dish.price_cents)}</Text>}
      </View>
      {dish.description ? (
        <Text variant="small" tone="muted">
          {dish.description}
        </Text>
      ) : null}
      {(dish.tags.length > 0 || match || dish.status === 'pending') && (
        <View style={styles.tags}>
          {match && (
            <View style={[styles.match, { backgroundColor: colors.primary }]}>
              <Icon name="checkmark-circle" size={13} color={colors.onPrimary} />
              <Text variant="caption" color={colors.onPrimary}>
                Fits your diet
              </Text>
            </View>
          )}
          {dish.tags.map((t) => (
            <TagPill key={t} size="xs" label={tagLabel(t)} color={tagColors(t, colors)} />
          ))}
          {dish.status === 'pending' && (
            <TagPill size="xs" label="Pending review" color={{ fg: colors.textMuted, bg: colors.border }} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.xs + 2, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  top: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  match: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 },
});
