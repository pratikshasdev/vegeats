import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';

import { Icon } from './icon';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  const rounded = Math.round(value * 2) / 2;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          size={size}
          color={colors.star}
          name={rounded >= i ? 'star' : rounded >= i - 0.5 ? 'star-half' : 'star-outline'}
        />
      ))}
    </View>
  );
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function StarInput({ value, onChange, size = 36 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { gap: 6 }]} accessibilityRole="adjustable" accessibilityLabel="Rating"
      accessibilityValue={{ min: 1, max: 5, now: value, text: value ? `${value} stars, ${LABELS[value]}` : 'No rating' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(5, value + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(1, value - 1));
      }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          testID={`star-${i}`}
          hitSlop={6}
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            onChange(i);
          }}>
          <Icon size={size} color={colors.star} name={value >= i ? 'star' : 'star-outline'} />
        </Pressable>
      ))}
    </View>
  );
}

export const ratingLabel = (v: number) => LABELS[v] ?? '';

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 1 } });
