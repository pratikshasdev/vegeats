import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Bounds, useRestaurantSearch } from '@/api/restaurants';
import { QuickFilters } from '@/components/quick-filters';
import { RestaurantMap, type RestaurantMapHandle } from '@/components/restaurant-map';
import { RestaurantCard } from '@/components/restaurant-card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { useSearchOrigin } from '@/hooks/use-location';
import { nativeMapStatus } from '@/lib/maps-availability';
import { formatDistance } from '@/lib/format';
import { activeFilterCount, useFilters } from '@/stores/filters';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';
import { radius, space, TAB_TOP_OFFSET } from '@/theme/tokens';

const MAP_STATUS = nativeMapStatus();
const HAS_MAP = MAP_STATUS === 'available';

const boundsMoved = (a: Bounds | null, b: Bounds | null) => {
  if (!a || !b) return a !== b;
  const span = Math.max(a.maxLat - a.minLat, 0.001);
  return (
    Math.abs(a.minLat - b.minLat) > span * 0.25 ||
    Math.abs(a.maxLng - b.maxLng) > span * 0.25 ||
    Math.abs((a.maxLat - a.minLat) - (b.maxLat - b.minLat)) > span * 0.3
  );
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { origin, permission, locateMe } = useSearchOrigin();
  const filters = useFilters();
  const dietTags = usePreferences((s) => s.dietTags);
  const mapRef = useRef<RestaurantMapHandle>(null);

  const [visibleBounds, setVisibleBounds] = useState<Bounds | null>(null);
  const [searchBounds, setSearchBounds] = useState<Bounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      lat: origin.lat,
      lng: origin.lng,
      query: filters.query,
      bounds: searchBounds,
      filters: {
        tags: filters.tags,
        dietLevels: filters.dietLevels,
        openNow: filters.openNow,
        radiusMiles: filters.radiusMiles,
        sort: filters.sort,
      },
      limit: 200,
    }),
    [origin.lat, origin.lng, filters.query, searchBounds, filters.tags, filters.dietLevels, filters.openNow, filters.radiusMiles, filters.sort],
  );
  const search = useRestaurantSearch(params);
  const results = search.data ?? [];
  const selected = results.find((r) => r.id === selectedId) ?? null;
  const showSearchArea = boundsMoved(visibleBounds, searchBounds) && visibleBounds !== null && searchBounds !== null;

  const searchPill = (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel="Search restaurants"
      onPress={() => router.navigate('/')}
      style={[styles.searchPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Icon name="search" size={18} color={colors.textMuted} />
      <Text tone={filters.query ? 'default' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
        {filters.query || `Search near ${origin.label}`}
      </Text>
    </Pressable>
  );

  if (!HAS_MAP) {
    // No native map (Android without a Google Maps key, or web): show the same results as a list.
    const hasFilters = activeFilterCount(filters) > 0 || !!filters.query;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + space.sm + TAB_TOP_OFFSET, paddingHorizontal: space.lg, gap: space.sm }}>
          {searchPill}
          <View style={{ marginHorizontal: -space.lg }}>
            <QuickFilters />
          </View>
          {MAP_STATUS === 'missing-android-key' && (
            <View testID="map-unavailable" style={[styles.notice, { backgroundColor: colors.primaryTint }]}>
              <Icon name="map-outline" size={18} color={colors.primary} />
              <Text variant="small" color={colors.primary} style={{ flex: 1 }}>
                Map view needs a Google Maps key on Android. Showing places as a list.
              </Text>
            </View>
          )}
        </View>
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: space.lg, gap: space.xl, flexGrow: 1 }}
          renderItem={({ item }) => <RestaurantCard restaurant={item} highlightTags={dietTags} />}
          ListEmptyComponent={
            search.isPending ? (
              <View style={{ gap: space.sm }}>
                <Skeleton style={{ height: 180 }} />
                <Skeleton style={{ height: 20, width: '60%' }} />
              </View>
            ) : search.isError ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn't load places"
                body="Check your connection and try again."
                actionLabel="Retry"
                onAction={() => search.refetch()}
              />
            ) : hasFilters ? (
              <EmptyState
                icon="options-outline"
                title="Nothing matches these filters"
                body={`No places within ${filters.radiusMiles} mi of ${origin.label} match. Try clearing filters or a wider distance.`}
                actionLabel="Clear filters"
                onAction={() => {
                  filters.reset();
                  filters.setQuery('');
                }}
              />
            ) : (
              <EmptyState
                icon="leaf-outline"
                title={`No places near ${origin.label} yet`}
                body="Try a wider distance or a different city."
                actionLabel="Change location"
                onAction={() => router.push('/location')}
              />
            )
          }
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <RestaurantMap
          ref={mapRef}
          center={origin}
          restaurants={results}
          showUserLocation={permission === 'granted'}
          onSelect={setSelectedId}
          onBoundsChange={(b) => {
            setVisibleBounds(b);
            setSearchBounds((prev) => prev ?? b);
          }}
        />

        <View style={[styles.topBar, { top: insets.top + space.sm + TAB_TOP_OFFSET }]} pointerEvents="box-none">
          {searchPill}
          <View style={{ marginHorizontal: -space.lg }}>
            <QuickFilters />
          </View>
          {showSearchArea && (
            <View style={styles.centerRow}>
              <Button
                label="Search this area"
                size="sm"
                icon="refresh"
                onPress={() => {
                  setSearchBounds(visibleBounds);
                  setSelectedId(null);
                }}
              />
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Center on my location"
          onPress={async () => {
            const p = await locateMe();
            const target = p ?? origin;
            mapRef.current?.recenter(target.lat, target.lng);
          }}
          style={[styles.locateBtn, { backgroundColor: colors.surface, bottom: (selected ? 250 : 24) + insets.bottom + 60 }]}>
          <Icon name="navigate" size={20} color={colors.primary} />
        </Pressable>

        {selected && (
          <View style={[styles.selectedCard, { backgroundColor: colors.surface, bottom: insets.bottom + 72 }]}>
            <Pressable accessibilityLabel="Close" onPress={() => setSelectedId(null)} style={styles.close} hitSlop={10}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </Pressable>
            <RestaurantCard restaurant={selected} highlightTags={dietTags} compact />
          </View>
        )}
      </View>

      {search.data && results.length === 0 && (
        <View style={[styles.emptyToast, { backgroundColor: colors.surface, bottom: insets.bottom + 90 }]}>
          <Text variant="small">No matching places in this area. Zoom out or change filters.</Text>
        </View>
      )}
      {selected && (
        <Text style={styles.srOnly} accessibilityLiveRegion="polite">
          {`${selected.name} selected, ${formatDistance(selected.distance_m)} away`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: space.lg, right: space.lg, gap: space.sm },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  centerRow: { alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md },
  locateBtn: {
    position: 'absolute',
    right: space.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedCard: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    padding: space.md,
    paddingBottom: space.lg,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  close: { position: 'absolute', right: space.md, top: space.md, zIndex: 2 },
  emptyToast: { position: 'absolute', alignSelf: 'center', padding: space.md, borderRadius: radius.md, marginHorizontal: space.lg },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
