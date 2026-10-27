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
import { Text } from '@/components/ui/text';
import { useSearchOrigin } from '@/hooks/use-location';
import { nativeMapStatus } from '@/lib/maps-availability';
import { formatDistance } from '@/lib/format';
import { useFilters } from '@/stores/filters';
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
  const showSearchArea = HAS_MAP && boundsMoved(visibleBounds, searchBounds) && visibleBounds !== null && searchBounds !== null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: HAS_MAP ? 1 : 0, height: HAS_MAP ? undefined : 260 }}>
        <RestaurantMap
          ref={mapRef}
          unavailableReason={HAS_MAP ? undefined : MAP_STATUS}
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

        {HAS_MAP && (
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
        )}

        {selected && HAS_MAP && (
          <View style={[styles.selectedCard, { backgroundColor: colors.surface, bottom: insets.bottom + 72 }]}>
            <Pressable accessibilityLabel="Close" onPress={() => setSelectedId(null)} style={styles.close} hitSlop={10}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </Pressable>
            <RestaurantCard restaurant={selected} highlightTags={dietTags} compact />
          </View>
        )}
      </View>

      {!HAS_MAP && (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: space.lg, gap: space.xl }}
          renderItem={({ item }) => <RestaurantCard restaurant={item} highlightTags={dietTags} />}
        />
      )}

      {search.data && results.length === 0 && HAS_MAP && (
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
