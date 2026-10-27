import { AppleMaps, GoogleMaps, type CameraMoveEvent } from 'expo-maps';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { Bounds, RestaurantSummary } from '@/api/restaurants';
import { dietLevelColors } from '@/lib/tags';
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
  /** When set, the native map is not mounted (e.g. no Google Maps key on Android). */
  unavailableReason?: 'missing-android-key' | 'unsupported';
}

export const DEFAULT_ZOOM = 12;

export function boundsFromCamera(e: CameraMoveEvent): Bounds | null {
  const lat = e.coordinates.latitude;
  const lng = e.coordinates.longitude;
  if (lat == null || lng == null || !e.latitudeDelta || !e.longitudeDelta) return null;
  return {
    minLat: lat - e.latitudeDelta / 2,
    maxLat: lat + e.latitudeDelta / 2,
    minLng: lng - e.longitudeDelta / 2,
    maxLng: lng + e.longitudeDelta / 2,
  };
}

export const RestaurantMap = forwardRef<RestaurantMapHandle, RestaurantMapProps>(function RestaurantMap(
  { center, restaurants, onSelect, onBoundsChange, showUserLocation, unavailableReason },
  ref,
) {
  const { colors, scheme } = useTheme();
  const appleRef = useRef<AppleMaps.MapView>(null);
  const googleRef = useRef<GoogleMaps.MapView>(null);

  useImperativeHandle(ref, () => ({
    recenter: (lat, lng, zoom = DEFAULT_ZOOM) => {
      const pos = { coordinates: { latitude: lat, longitude: lng }, zoom };
      appleRef.current?.setCameraPosition(pos);
      googleRef.current?.setCameraPosition(pos);
    },
  }));

  const initialCamera = useMemo(
    () => ({ coordinates: { latitude: center.lat, longitude: center.lng }, zoom: DEFAULT_ZOOM }),
    // Only the first center is used as the initial camera; later moves go through recenter().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onCameraMove = (e: CameraMoveEvent) => {
    const b = boundsFromCamera(e);
    if (b) onBoundsChange(b);
  };
  const onMarkerClick = (m: { id?: string }) => {
    if (m.id) onSelect(m.id);
  };

  if (unavailableReason) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryTint, justifyContent: 'center' }]}>
        <EmptyState
          icon="map-outline"
          title="Map isn't set up on Android yet"
          body="Add a Google Maps key (GOOGLE_MAPS_ANDROID_API_KEY) and rebuild to see the map. The list below shows the same places."
        />
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        ref={appleRef}
        style={StyleSheet.absoluteFill}
        cameraPosition={initialCamera}
        colorScheme={scheme === 'dark' ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
        properties={{ isMyLocationEnabled: showUserLocation, selectionEnabled: true }}
        uiSettings={{ myLocationButtonEnabled: false, compassEnabled: true }}
        markers={restaurants.map((r) => ({
          id: r.id,
          coordinates: { latitude: r.lat, longitude: r.lng },
          title: r.name,
          systemImage: 'leaf.fill',
          tintColor: dietLevelColors(r.diet_level, colors).fg,
        }))}
        onMarkerClick={onMarkerClick}
        onCameraMove={onCameraMove}
      />
    );
  }

  return (
    <GoogleMaps.View
      ref={googleRef}
      style={StyleSheet.absoluteFill}
      cameraPosition={initialCamera}
      colorScheme={scheme === 'dark' ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
      properties={{ isMyLocationEnabled: showUserLocation }}
      uiSettings={{ myLocationButtonEnabled: false, mapToolbarEnabled: false, zoomControlsEnabled: false }}
      markers={restaurants.map((r) => ({
        id: r.id,
        coordinates: { latitude: r.lat, longitude: r.lng },
        title: r.name,
        snippet: r.cuisines?.[0],
      }))}
      onMarkerClick={onMarkerClick}
      onCameraMove={onCameraMove}
    />
  );
});
