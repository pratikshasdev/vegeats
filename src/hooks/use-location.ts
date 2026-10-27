import * as Location from 'expo-location';
import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Place {
  lat: number;
  lng: number;
  label: string;
  source: 'device' | 'manual' | 'default';
}

// Fallback when location is denied: Ann Arbor, the launch market's center.
export const DEFAULT_PLACE: Place = { lat: 42.2808, lng: -83.743, label: 'Ann Arbor, MI', source: 'default' };

export const MICHIGAN_PLACES: Place[] = [
  { lat: 42.2808, lng: -83.743, label: 'Ann Arbor', source: 'manual' },
  { lat: 42.3314, lng: -83.0458, label: 'Detroit', source: 'manual' },
  { lat: 42.3087, lng: -83.4822, label: 'Canton', source: 'manual' },
  { lat: 42.4806, lng: -83.4755, label: 'Novi', source: 'manual' },
  { lat: 42.4606, lng: -83.1346, label: 'Ferndale', source: 'manual' },
  { lat: 42.4895, lng: -83.1446, label: 'Royal Oak', source: 'manual' },
  { lat: 42.3223, lng: -83.1763, label: 'Dearborn', source: 'manual' },
  { lat: 42.737, lng: -84.4839, label: 'East Lansing', source: 'manual' },
  { lat: 42.9634, lng: -85.6681, label: 'Grand Rapids', source: 'manual' },
  { lat: 42.2917, lng: -85.5872, label: 'Kalamazoo', source: 'manual' },
  { lat: 44.7631, lng: -85.6206, label: 'Traverse City', source: 'manual' },
];

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationState {
  /** Last known device location. */
  place: Place | null;
  /** A city the user picked instead of GPS. */
  manual: Place | null;
  permission: PermissionStatus;
  locating: boolean;
  setManual: (p: Place | null) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      place: null,
      manual: null,
      permission: 'undetermined',
      locating: false,
      setManual: (manual) => set({ manual }),
    }),
    {
      name: 'vegeats-location',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ place, manual }) => ({ place, manual }),
    },
  ),
);

let inFlight: Promise<Place | null> | null = null;

/** Ask for (optionally prompting) permission and refresh the device location. De-duplicated across callers. */
export function refreshDeviceLocation(prompt: boolean): Promise<Place | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const store = useLocationStore;
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' && prompt) ({ status } = await Location.requestForegroundPermissionsAsync());
      const permission: PermissionStatus = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
      store.setState({ permission });
      if (permission !== 'granted') return null;
      store.setState({ locating: true });
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      let label = 'Current location';
      try {
        const [rev] = await Location.reverseGeocodeAsync(pos.coords);
        if (rev?.city) label = rev.city;
      } catch {
        // Reverse geocoding is best-effort.
      }
      const place: Place = { lat: pos.coords.latitude, lng: pos.coords.longitude, label, source: 'device' };
      store.setState({ place });
      return place;
    } catch {
      return null;
    } finally {
      store.setState({ locating: false });
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Current search origin: a picked city, else the device location, else the default. */
export function useSearchOrigin() {
  const place = useLocationStore((s) => s.place);
  const manual = useLocationStore((s) => s.manual);
  const permission = useLocationStore((s) => s.permission);
  const locating = useLocationStore((s) => s.locating);
  const setManual = useLocationStore((s) => s.setManual);

  useEffect(() => {
    refreshDeviceLocation(true);
  }, []);

  return {
    origin: manual ?? place ?? DEFAULT_PLACE,
    permission,
    locating,
    usingManual: !!manual,
    locateMe: async () => {
      setManual(null);
      return refreshDeviceLocation(true);
    },
    chooseCity: (p: Place) => setManual(p),
  };
}
