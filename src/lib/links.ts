import { Linking, Platform } from 'react-native';

export function directionsUrl(lat: number, lng: number, name: string, os: string = Platform.OS): string {
  const label = encodeURIComponent(name);
  if (os === 'ios') return `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function phoneUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function openExternal(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
