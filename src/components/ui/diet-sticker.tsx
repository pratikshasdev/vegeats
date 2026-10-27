import { StyleSheet, View } from 'react-native';

import { DIET_LEVEL_BY_VALUE, dietLevelColors, type DietLevel } from '@/lib/tags';
import { useTheme } from '@/theme/theme';
import { fonts } from '@/theme/tokens';

import { Text } from './text';

/**
 * The VegEats signature: a round produce-style sticker stating how plant-based a place is.
 * Slightly rotated, with an inner ring, like the label on a piece of fruit.
 */
export function DietSticker({ level, size = 64, tilt = -8 }: { level: DietLevel; size?: number; tilt?: number }) {
  const { colors } = useTheme();
  const { fg, bg } = dietLevelColors(level, colors);
  const meta = DIET_LEVEL_BY_VALUE[level];
  const top = level === 'fully_vegan' ? '100%' : level === 'vegetarian' ? 'all' : 'veg';
  const bottom = level === 'fully_vegan' ? 'vegan' : level === 'vegetarian' ? 'veggie' : 'options';
  return (
    <View
      accessible
      accessibilityLabel={meta.label}
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fg,
          borderWidth: Math.max(2, size * 0.035),
          borderColor: 'rgba(255,255,255,0.92)',
          transform: [{ rotate: `${tilt}deg` }],
        },
      ]}>
      <View
        style={[
          styles.inner,
          { borderRadius: size / 2, borderColor: bg, margin: Math.max(3, size * 0.06) },
        ]}>
        <Text
          style={{ fontFamily: fonts.heavy, fontSize: size * 0.27, lineHeight: size * 0.3, color: bg }}
          maxFontSizeMultiplier={1}>
          {top}
        </Text>
        <Text
          style={{ fontFamily: fonts.bold, fontSize: size * 0.17, lineHeight: size * 0.2, color: bg }}
          maxFontSizeMultiplier={1}>
          {bottom}
        </Text>
      </View>
    </View>
  );
}

/** Inline, compact version for lists. */
export function DietLabel({ level }: { level: DietLevel }) {
  const { colors } = useTheme();
  const { fg, bg } = dietLevelColors(level, colors);
  return (
    <View style={[styles.label, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text variant="caption" color={fg}>
        {DIET_LEVEL_BY_VALUE[level].label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inner: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
