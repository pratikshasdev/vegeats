import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Review } from '@/api/reviews';
import { formatRelativeDate } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

import { Button } from './ui/button';
import { Stars } from './ui/stars';
import { Text } from './ui/text';

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const { colors } = useTheme();
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return url ? (
    <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryTint }]}>
      <Text variant="smallStrong" tone="primary">
        {initials || '?'}
      </Text>
    </View>
  );
}

export function ReviewItem({
  review,
  isMine,
  onEdit,
  onReport,
}: {
  review: Review;
  isMine: boolean;
  onEdit?: () => void;
  onReport?: () => void;
}) {
  const name = review.profiles?.display_name ?? 'VegEats member';
  return (
    <View style={styles.item} testID={`review-${review.id}`}>
      <View style={styles.head}>
        <Avatar name={name} url={review.profiles?.avatar_url} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="smallStrong">{isMine ? `${name} (you)` : name}</Text>
          <View style={styles.meta}>
            <Stars value={review.rating} size={13} />
            <Text variant="caption" tone="muted">
              {formatRelativeDate(review.created_at)}
            </Text>
          </View>
        </View>
        {isMine
          ? onEdit && <Button label="Edit" size="sm" variant="ghost" onPress={onEdit} />
          : onReport && <Button label="Report" size="sm" variant="ghost" onPress={onReport} />}
      </View>
      {review.body ? <Text>{review.body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
