import createIconSet from '@expo/vector-icons/createIconSet';

import { useTheme } from '@/theme/theme';

import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

// Ionicons, registered under the font's own name ("Ionicons"). The .ttf is embedded in the
// native app by the expo-font config plugin (app.config.ts), so icons render immediately and
// never depend on downloading the font from the dev server. Web still loads it as an asset.
const Ionicons = createIconSet(glyphMap, 'Ionicons', require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'));

export type IconName = keyof typeof glyphMap;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} accessibilityElementsHidden importantForAccessibility="no" />;
}
