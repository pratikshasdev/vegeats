import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Bounds, RestaurantSummary } from '@/api/restaurants';
import { useTheme } from '@/theme/theme';

import { EmptyState } from './ui/feedback';

export interface RestaurantMapHandle {
  recenter: (lat: number, lng: number, zoom?: number) => void;
}

export interface RestaurantMapProps {
  center: { lat: number; lng: number };
  restaurants: RestaurantSummary[];
  onSelect: (id: string) => void;
  onBoundsChange: (bounds: Bounds) => void;
  showUserLocation: boolean;
}

export const DEFAULT_ZOOM = 12;

// expo-maps has no web implementation; the web preview shows the list below the map area instead.
export const RestaurantMap = forwardRef<RestaurantMapHandle, RestaurantMapProps>(function RestaurantMap(_props, ref) {
  const { colors } = useTheme();
  useImperativeHandle(ref, () => ({ recenter: () => undefined }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryTint, justifyContent: 'center' }]}>
      <EmptyState
        icon="map-outline"
        title="Map runs on iOS and Android"
        body="Open VegEats in the iOS Simulator or Android Emulator to browse the map. The list below still works here."
      />
    </View>
  );
});
