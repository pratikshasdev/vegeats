import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RestaurantSummary } from '@/api/restaurants';
import { formatDistance, formatPriceLevel, formatRating } from '@/lib/format';
import { tagColors, tagLabel } from '@/lib/tags';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

import { OpenStatus } from './open-status';
import { TagPill } from './ui/chip';
import { DietSticker } from './ui/diet-sticker';
import { Icon } from './ui/icon';
import { Text } from './ui/text';

const VISIBLE_TAGS = 3;

export function ratingSummary(r: {
  rating_avg: number;
  rating_count: number;
  external_rating: number | null;
  external_rating_count: number | null;
}) {
  if (r.rating_count > 0) return { value: Number(r.rating_avg), count: r.rating_count, source: 'VegEats' as const };
  if (r.external_rating) return { value: Number(r.external_rating), count: r.external_rating_count ?? 0, source: 'web' as const };
  return null;
}

export function RestaurantCard({
  restaurant: r,
  highlightTags = [],
  compact = false,
}: {
  restaurant: RestaurantSummary;
  highlightTags?: string[];
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const rating = ratingSummary(r);
  const meta = [r.cuisines?.[0], formatPriceLevel(r.price_level), formatDistance(r.distance_m)].filter(Boolean);
  // Show the user's own diet tags first so matches are visible at a glance.
  const tags = [...(r.tags ?? [])].sort((a, b) => Number(highlightTags.includes(b)) - Number(highlightTags.includes(a)));

  return (
    <Link href={{ pathname: '/restaurant/[id]', params: { id: r.id } }} asChild>
      <Pressable
        testID={`restaurant-card-${r.id}`}
        accessibilityRole="link"
        accessibilityLabel={`${r.name}, ${meta.join(', ')}`}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
        <View>
          <View style={[styles.photo, compact && styles.photoCompact, { backgroundColor: colors.primaryTint }]}>
            {r.cover_photo_url ? (
              <Image source={{ uri: r.cover_photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.photoFallback}>
                <Icon name="leaf" size={40} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.sticker}>
            <DietSticker level={r.diet_level} size={compact ? 50 : 58} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {r.name}
            </Text>
            {rating && (
              <View style={styles.rating}>
                <Icon name="star" size={15} color={colors.star} />
                <Text variant="smallStrong">{formatRating(rating.value)}</Text>
                <Text variant="small" tone="muted">
                  ({rating.count})
                </Text>
              </View>
            )}
          </View>
          <Text variant="small" tone="muted" numberOfLines={1}>
            {meta.join(', ')}
          </Text>
          <OpenStatus hours={r.hours} timeZone={r.timezone} />
          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.slice(0, VISIBLE_TAGS).map((t) => (
                <TagPill key={t} label={tagLabel(t)} color={tagColors(t, colors)} />
              ))}
              {tags.length > VISIBLE_TAGS && (
                <Text variant="caption" tone="muted">
                  +{tags.length - VISIBLE_TAGS} more
                </Text>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  photo: { height: 180, borderRadius: radius.lg, overflow: 'hidden' },
  photoCompact: { height: 110, borderRadius: radius.md },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sticker: { position: 'absolute', right: space.md, bottom: -space.lg },
  body: { gap: space.xs, paddingRight: 72 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
});
