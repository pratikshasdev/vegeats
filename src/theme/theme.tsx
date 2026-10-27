import { useEffect } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { usePreferences } from '@/stores/preferences';

import { darkColors, lightColors, type ThemeColors } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

/** Applies the saved theme preference to native UI (status bar, tab bar, alerts, maps). */
export function useApplyThemePreference() {
  const pref = usePreferences((s) => s.theme);
  useEffect(() => {
    if (Platform.OS === 'web' || typeof Appearance.setColorScheme !== 'function') return;
    Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
  }, [pref]);
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const pref = usePreferences((s) => s.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return { scheme, colors: scheme === 'dark' ? darkColors : lightColors };
}
