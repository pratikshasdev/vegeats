import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme/theme';
import { type as typeScale, type ThemeColors, type TypeVariant } from '@/theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: 'default' | 'muted' | 'primary' | 'accent' | 'danger' | 'inverse';
  color?: string;
  align?: 'left' | 'center' | 'right';
}

const toneColor = (tone: NonNullable<TextProps['tone']>, c: ThemeColors) =>
  ({
    default: c.text,
    muted: c.textMuted,
    primary: c.primary,
    accent: c.accent,
    danger: c.danger,
    inverse: c.textInverse,
  })[tone];

export function Text({ variant = 'body', tone = 'default', color, align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[typeScale[variant], { color: color ?? toneColor(tone, colors) }, align && { textAlign: align }, style]}
    />
  );
}
