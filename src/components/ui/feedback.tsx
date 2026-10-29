import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryTint }]}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body && (
        <Text tone="muted" align="center" style={{ maxWidth: 320 }}>
          {body}
        </Text>
      )}
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} variant="secondary" />}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: colors.accentTint }]}>
      <Icon name="alert-circle" color={colors.danger} />
      <Text variant="small" style={{ flex: 1 }} color={colors.text}>
        {message}
      </Text>
      {onRetry && <Button label="Retry" size="sm" variant="ghost" onPress={onRetry} />}
    </View>
  );
}

export function Notice({ icon = 'information-circle', children }: { icon?: IconName; children: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.primaryTint }]}>
      <Icon name={icon} color={colors.primary} />
      <Text variant="small" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

/** Pulsing placeholder block. Respects reduce-motion by staying static when animations are off. */
export function Skeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    let cancelled = false;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!reduce && !cancelled) loop.start();
      })
      .catch(() => loop.start());
    return () => {
      cancelled = true;
      loop.stop();
    };
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: colors.border, borderRadius: radius.md, opacity }, style]} />;
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
});
