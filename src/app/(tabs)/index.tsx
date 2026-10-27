import { router } from 'expo-router';
import { useDeferredValue, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { friendlyError } from '@/api/query-client';
import { useRestaurantSearch } from '@/api/restaurants';
import { QuickFilters } from '@/components/quick-filters';
import { RestaurantCard } from '@/components/restaurant-card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useSearchOrigin } from '@/hooks/use-location';
import { pluralize } from '@/lib/format';
import { activeFilterCount, useFilters } from '@/stores/filters';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';
import { space, TAB_TOP_OFFSET } from '@/theme/tokens';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { origin, locating } = useSearchOrigin();
  const filters = useFilters();
  const dietTags = usePreferences((s) => s.dietTags);
  const query = useDeferredValue(filters.query);

  const params = useMemo(
    () => ({
      lat: origin.lat,
      lng: origin.lng,
      query,
      filters: {
        tags: filters.tags,
        dietLevels: filters.dietLevels,
        openNow: filters.openNow,
        radiusMiles: filters.radiusMiles,
        sort: filters.sort,
      },
    }),
    [origin.lat, origin.lng, query, filters.tags, filters.dietLevels, filters.openNow, filters.radiusMiles, filters.sort],
  );
  const search = useRestaurantSearch(params);
  const results = search.data ?? [];
  const hasFilters = activeFilterCount(filters) > 0 || !!query.trim();

  const header = (
    <View style={{ gap: space.md, paddingTop: insets.top + space.md + TAB_TOP_OFFSET }}>
      <View style={styles.pad}>
        <Pressable
          testID="change-location"
          accessibilityRole="button"
          accessibilityLabel={`Searching near ${origin.label}. Change location`}
          onPress={() => router.push('/location')}
          style={styles.locationRow}>
          <Icon name="location" size={16} color={colors.primary} />
          <Text variant="smallStrong" tone="primary">
            {locating ? 'Finding you…' : `Near ${origin.label}`}
          </Text>
          <Icon name="chevron-down" size={14} color={colors.primary} />
        </Pressable>
        <Text variant="display" style={{ marginTop: space.xs }}>
          Eat plant-forward
        </Text>
      </View>
      <View style={styles.pad}>
        <TextField
          testID="search-input"
          placeholder="Search restaurants, cuisines or dishes"
          value={filters.query}
          onChangeText={filters.setQuery}
          leadingIcon="search"
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <QuickFilters />
      <View style={[styles.pad, styles.countRow]}>
        <Text variant="small" tone="muted">
          {search.isPending ? 'Searching…' : pluralize(results.length, 'place')}
        </Text>
        {hasFilters && (
          <Button
            label="Clear filters"
            size="sm"
            variant="ghost"
            onPress={() => {
              filters.reset();
              filters.setQuery('');
            }}
          />
        )}
      </View>
      {search.isError && (
        <View style={styles.pad}>
          <ErrorBanner message={friendlyError(search.error)} onRetry={() => search.refetch()} />
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      testID="discover-list"
      style={{ backgroundColor: colors.background }}
      data={results}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: space.xxl }}
      contentInsetAdjustmentBehavior="never"
      renderItem={({ item }) => (
        <View style={styles.pad}>
          <RestaurantCard restaurant={item} highlightTags={dietTags} />
        </View>
      )}
      refreshControl={
        <RefreshControl refreshing={search.isRefetching} onRefresh={() => {
            search.refetch();
          }} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        search.isPending ? (
          <View style={[styles.pad, { gap: space.xxl }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ gap: space.sm }}>
                <Skeleton style={{ height: 180 }} />
                <Skeleton style={{ height: 20, width: '60%' }} />
                <Skeleton style={{ height: 14, width: '40%' }} />
              </View>
            ))}
          </View>
        ) : search.isError ? undefined : hasFilters ? (
          <EmptyState
            icon="funnel-outline"
            title="No matches nearby"
            body="Try fewer filters or a wider distance. You can also add a place you know."
            actionLabel="Add a restaurant"
            onAction={() => router.push('/add-restaurant')}
          />
        ) : (
          <EmptyState
            icon="leaf-outline"
            title={`No places listed near ${origin.label} yet`}
            body="Know a spot with great vegan or vegetarian food? Add it and we'll review it for everyone."
            actionLabel="Add a restaurant"
            onAction={() => router.push('/add-restaurant')}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 38 },
});
