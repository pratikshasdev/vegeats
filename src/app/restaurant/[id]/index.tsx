import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { groupMenu, useDishes } from '@/api/menu';
import { usePhotos } from '@/api/photos';
import { friendlyError } from '@/api/query-client';
import { useRestaurant } from '@/api/restaurants';
import { useReviews } from '@/api/reviews';
import { DishRow } from '@/components/dish-row';
import { OpenStatus } from '@/components/open-status';
import { ratingSummary } from '@/components/restaurant-card';
import { ReviewItem } from '@/components/review-item';
import { Button } from '@/components/ui/button';
import { TagPill } from '@/components/ui/chip';
import { DietSticker } from '@/components/ui/diet-sticker';
import { EmptyState, ErrorBanner, Notice, Skeleton } from '@/components/ui/feedback';
import { Icon, type IconName } from '@/components/ui/icon';
import { Stars } from '@/components/ui/stars';
import { Text } from '@/components/ui/text';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatPriceLevel, formatRating, fullAddress, pluralize } from '@/lib/format';
import { DAY_KEYS, weeklyRows, zonedNow } from '@/lib/hours';
import { directionsUrl, normalizeWebsite, openExternal, phoneUrl } from '@/lib/links';
import { DIET_LEVEL_BY_VALUE, satisfies, tagColors, tagLabel } from '@/lib/tags';
import { useAuth } from '@/providers/auth-provider';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

function Action({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: pressed ? colors.primaryTint : colors.surface, borderColor: colors.border }]}>
      <Icon name={icon} size={20} color={colors.primary} />
      <Text variant="caption" tone="primary">
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const wanted = usePreferences((s) => s.dietTags);
  const [onlyMine, setOnlyMine] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);

  const restaurant = useRestaurant(id);
  const dishes = useDishes(id);
  const reviews = useReviews(id);
  const photos = usePhotos(id);

  const r = restaurant.data;
  const allDishes = useMemo(() => dishes.data ?? [], [dishes.data]);
  const matching = useMemo(() => allDishes.filter((d) => wanted.length > 0 && satisfies(d.tags, wanted)), [allDishes, wanted]);
  const menu = useMemo(() => groupMenu(onlyMine ? matching : allDishes), [onlyMine, matching, allDishes]);
  const myReview = reviews.data?.find((rv) => rv.user_id === user?.id);

  if (restaurant.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Skeleton style={{ height: 280, borderRadius: 0 }} />
        <View style={{ padding: space.lg, gap: space.md }}>
          <Skeleton style={{ height: 30, width: '70%' }} />
          <Skeleton style={{ height: 16, width: '50%' }} />
          <Skeleton style={{ height: 16, width: '40%' }} />
        </View>
      </View>
    );
  }

  if (restaurant.isError || !r) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 60, padding: space.lg }}>
        <EmptyState
          icon="alert-circle-outline"
          title="This place couldn't be loaded"
          body={restaurant.error ? friendlyError(restaurant.error) : 'It may have been removed.'}
          actionLabel="Try again"
          onAction={() => restaurant.refetch()}
        />
      </View>
    );
  }

  const rating = ratingSummary(r);
  const hourRows = weeklyRows(r.hours);
  const todayKey = DAY_KEYS[zonedNow(new Date(), r.timezone).day];
  const visibleHours = showAllHours ? hourRows : hourRows.filter((h) => h.day === todayKey);
  const meta = [r.cuisines.join(', '), formatPriceLevel(r.price_level)].filter(Boolean).join(', ');

  const report = (targetType: 'restaurant' | 'review' | 'photo', targetId: string) =>
    requireAuth(() => router.push({ pathname: '/report', params: { targetType, targetId, restaurantId: r.id } }), 'Sign in to report a problem');

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView
        testID="restaurant-screen"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}
        contentInsetAdjustmentBehavior="never">
        <View style={[styles.hero, { backgroundColor: colors.primaryTint }]}>
          {r.cover_photo_url ? (
            <Image source={{ uri: r.cover_photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.heroFallback}>
              <Icon name="leaf" size={64} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.headBlock}>
          <View style={styles.stickerWrap}>
            <DietSticker level={r.diet_level} size={84} />
          </View>
          <Text variant="title" testID="restaurant-name">
            {r.name}
          </Text>
          <Text tone="muted">{DIET_LEVEL_BY_VALUE[r.diet_level].description}</Text>
          {meta ? <Text variant="smallStrong">{meta}</Text> : null}
          <OpenStatus hours={r.hours} timeZone={r.timezone} />
          {rating && (
            <View style={styles.ratingRow}>
              <Stars value={rating.value} />
              <Text variant="smallStrong">{formatRating(rating.value)}</Text>
              <Text variant="small" tone="muted">
                {rating.source === 'VegEats'
                  ? pluralize(rating.count, 'VegEats review')
                  : `${pluralize(rating.count, 'rating')} on the web`}
              </Text>
            </View>
          )}
        </View>

        {r.status === 'pending' && (
          <View style={styles.pad}>
            <Notice icon="time-outline">This listing is waiting for review. Only you can see it until it’s approved.</Notice>
          </View>
        )}

        <View style={[styles.pad, styles.actions]}>
          <Action testID="action-directions" icon="navigate" label="Directions" onPress={() => openExternal(directionsUrl(r.lat, r.lng, r.name))} />
          {r.phone && <Action icon="call" label="Call" onPress={() => openExternal(phoneUrl(r.phone!))} />}
          {r.website && <Action icon="globe-outline" label="Website" onPress={() => openExternal(normalizeWebsite(r.website!))} />}
          <Action
            testID="action-review"
            icon="star"
            label={myReview ? 'Edit review' : 'Review'}
            onPress={() => requireAuth(() => router.push(`/restaurant/${r.id}/review`), 'Sign in to write a review')}
          />
        </View>

        {r.tags.length > 0 && (
          <View style={[styles.pad, styles.tags]}>
            {r.tags.map((t) => (
              <TagPill key={t} label={tagLabel(t)} color={tagColors(t, colors)} />
            ))}
          </View>
        )}

        <Section
          title="Menu"
          action={
            <Button
              testID="add-dish"
              label="Add a dish"
              size="sm"
              variant="ghost"
              icon="add"
              onPress={() => requireAuth(() => router.push(`/restaurant/${r.id}/add-dish`), 'Sign in to add dishes')}
            />
          }>
          {wanted.length > 0 && allDishes.length > 0 && (
            <View style={[styles.matchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="smallStrong">
                  {matching.length === 0
                    ? 'No dishes marked for your diet yet'
                    : matching.length === 1
                      ? '1 dish fits your diet'
                      : `${matching.length} dishes fit your diet`}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={2}>
                  {wanted.map(tagLabel).join(', ')}
                </Text>
              </View>
              <Switch
                testID="only-my-diet"
                accessibilityLabel="Show only dishes that fit my diet"
                value={onlyMine}
                onValueChange={setOnlyMine}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
          )}
          {dishes.isError && <ErrorBanner message={friendlyError(dishes.error)} onRetry={() => dishes.refetch()} />}
          {dishes.isPending ? (
            <Skeleton style={{ height: 80 }} />
          ) : menu.length === 0 ? (
            <Text tone="muted">
              {onlyMine
                ? 'Nothing on the menu is marked for your diet. Turn the switch off to see everything.'
                : 'No menu yet. If you know what they serve, add a dish or a photo of the menu.'}
            </Text>
          ) : (
            menu.map((section) => (
              <View key={section.category} style={{ gap: space.sm }}>
                <Text variant="subheading" tone="primary">
                  {section.category}
                </Text>
                {section.dishes.map((d) => (
                  <DishRow key={d.id} dish={d} wanted={wanted} />
                ))}
              </View>
            ))
          )}
          <Text variant="caption" tone="muted">
            Menu info comes from the community and may be out of date. Always confirm allergens and ingredients with staff.
          </Text>
        </Section>

        <Section
          title="Photos"
          action={
            <Button
              label="Add photo"
              size="sm"
              variant="ghost"
              icon="camera-outline"
              onPress={() => requireAuth(() => router.push(`/restaurant/${r.id}/add-photo`), 'Sign in to add photos')}
            />
          }>
          {(photos.data ?? []).length === 0 ? (
            <Text tone="muted">No photos yet. A clear shot of the menu helps everyone.</Text>
          ) : (
            <FlatList
              horizontal
              data={photos.data}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.sm }}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={item.caption ?? `${item.kind} photo`}
                  onLongPress={() =>
                    Alert.alert('Photo', item.caption ?? undefined, [
                      { text: 'Report photo', style: 'destructive', onPress: () => report('photo', item.id) },
                      { text: 'Close', style: 'cancel' },
                    ])
                  }>
                  <Image source={{ uri: item.url }} style={styles.photo} contentFit="cover" />
                  {item.status === 'pending' && (
                    <View style={[styles.pendingTag, { backgroundColor: colors.overlay }]}>
                      <Text variant="caption" color="#fff">
                        Pending
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
            />
          )}
        </Section>

        <Section
          title="Hours"
          action={
            hourRows.length > 0 ? (
              <Button label={showAllHours ? 'Show today' : 'Full week'} size="sm" variant="ghost" onPress={() => setShowAllHours((v) => !v)} />
            ) : undefined
          }>
          {hourRows.length === 0 ? (
            <Text tone="muted">Hours aren’t listed. Call ahead before you go.</Text>
          ) : (
            visibleHours.map((h) => (
              <View key={h.day} style={styles.hourRow}>
                <Text variant={h.day === todayKey ? 'bodyStrong' : 'body'}>{h.label}</Text>
                <Text variant={h.day === todayKey ? 'bodyStrong' : 'body'} tone={h.text === 'Closed' ? 'muted' : 'default'}>
                  {h.text}
                </Text>
              </View>
            ))
          )}
          <Pressable onPress={() => openExternal(directionsUrl(r.lat, r.lng, r.name))} accessibilityRole="link">
            <Text variant="small" tone="primary">
              {fullAddress(r)}
            </Text>
          </Pressable>
        </Section>

        <Section
          title="Reviews"
          action={
            <Button
              label={myReview ? 'Edit yours' : 'Write one'}
              size="sm"
              variant="ghost"
              icon="create-outline"
              onPress={() => requireAuth(() => router.push(`/restaurant/${r.id}/review`), 'Sign in to write a review')}
            />
          }>
          {reviews.isError && <ErrorBanner message={friendlyError(reviews.error)} onRetry={() => reviews.refetch()} />}
          {(reviews.data ?? []).length === 0 && !reviews.isPending ? (
            <Text tone="muted">No reviews yet. Tell others how the plant-based options were.</Text>
          ) : (
            (reviews.data ?? []).map((rv) => (
              <ReviewItem
                key={rv.id}
                review={rv}
                isMine={rv.user_id === user?.id}
                onEdit={() => router.push(`/restaurant/${r.id}/review`)}
                onReport={() => report('review', rv.id)}
              />
            ))
          )}
        </Section>

        <View style={[styles.pad, { marginTop: space.xl, alignItems: 'center' }]}>
          <Button
            testID="report-listing"
            label="Report incorrect info"
            variant="danger"
            size="sm"
            icon="flag-outline"
            onPress={() => report('restaurant', r.id)}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { height: 280 },
  heroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headBlock: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.xs + 2, paddingRight: 110 },
  stickerWrap: { position: 'absolute', right: space.lg, top: -42 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pad: { paddingHorizontal: space.lg, marginTop: space.lg },
  actions: { flexDirection: 'row', gap: space.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  section: { paddingHorizontal: space.lg, marginTop: space.xxl, gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  photo: { width: 140, height: 140, borderRadius: radius.md },
  pendingTag: { position: 'absolute', left: 6, top: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
});
