import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Category color for selected state. Defaults to primary. */
  color?: { fg: string; bg: string };
  badge?: number;
  testID?: string;
}

/** Toggleable filter chip. Selected chips take their category color so filters read like the tags they match. */
export function Chip({ label, selected, onPress, icon, color, badge, testID }: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? (color?.fg ?? colors.primary) : colors.text;
  const bg = selected ? (color?.bg ?? colors.primaryTint) : colors.surface;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={badge ? `${label}, ${badge} active` : label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: bg, borderColor: selected ? fg : colors.border, opacity: pressed ? 0.75 : 1 },
      ]}>
      {selected && !icon && <Icon name="checkmark" size={15} color={fg} />}
      {icon && <Icon name={icon} size={16} color={fg} />}
      <Text variant="smallStrong" color={fg} numberOfLines={1}>
        {label}
      </Text>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text variant="caption" color={colors.onPrimary}>
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Non-interactive tag label: small, colored, scannable. */
export function TagPill({ label, color, size = 'sm' }: { label: string; color: { fg: string; bg: string }; size?: 'sm' | 'xs' }) {
  return (
    <View style={[styles.pill, size === 'xs' && styles.pillXs, { backgroundColor: color.bg }]}>
      <Text variant="caption" color={color.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
  pillXs: { paddingHorizontal: 6, paddingVertical: 1 },
});
