import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Google Maps (Android) aborts the whole app if it starts without an API key, so the map
 * is only rendered when one was configured at build time (GOOGLE_MAPS_ANDROID_API_KEY).
 * Apple Maps (iOS) needs no key. expo-maps has no web implementation.
 */
export function nativeMapStatus(): 'available' | 'missing-android-key' | 'unsupported' {
  if (Platform.OS === 'ios') return 'available';
  if (Platform.OS === 'android') {
    const key = (Constants.expoConfig?.android as { config?: { googleMaps?: { apiKey?: string } } } | undefined)?.config
      ?.googleMaps?.apiKey;
    return key ? 'available' : 'missing-android-key';
  }
  return 'unsupported';
}
