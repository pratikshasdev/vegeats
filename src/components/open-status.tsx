import { StyleSheet, View } from 'react-native';

import { openState, openStateLabel } from '@/lib/hours';
import { useTheme } from '@/theme/theme';

import { Text } from './ui/text';

export function OpenStatus({ hours, timeZone, now }: { hours: unknown; timeZone: string; now?: Date }) {
  const { colors } = useTheme();
  const state = openState(hours, timeZone, now);
  const dot =
    state.kind === 'open' ? (state.closingSoon ? colors.star : colors.success) : state.kind === 'closed' ? colors.danger : colors.textMuted;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text variant="small" tone={state.kind === 'unknown' ? 'muted' : 'default'} numberOfLines={1}>
        {openStateLabel(state, now, timeZone)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
