import { Platform } from 'react-native';

// VegEats design tokens.
// Visual idea: produce-sticker badges and ingredient-label clarity. Diet levels and
// dietary tags always use the same colors so they can be scanned like an allergy card.

export const palette = {
  basil: '#17583A',
  basilDeep: '#0E3D27',
  basilTint: '#DCEBDD',
  turmeric: '#E3A21A',
  turmericTint: '#FBEBC6',
  slate: '#5B6B73',
  slateTint: '#E3E8EA',
  beet: '#B0225B',
  beetTint: '#F6DCE6',
  mist: '#EEF2EC',
  ink: '#14201A',
  white: '#FFFFFF',
  sky: '#2E6FA8',
  skyTint: '#DDE9F4',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primaryTint: string;
  onPrimary: string;
  accent: string;
  accentTint: string;
  danger: string;
  success: string;
  star: string;
  overlay: string;
  vegan: string;
  veganTint: string;
  vegetarian: string;
  vegetarianTint: string;
  vegFriendly: string;
  vegFriendlyTint: string;
  allergen: string;
  allergenTint: string;
  health: string;
  healthTint: string;
  religious: string;
  religiousTint: string;
}

export const lightColors: ThemeColors = {
  background: palette.mist,
  surface: palette.white,
  surfaceRaised: palette.white,
  border: '#D5DDD3',
  text: palette.ink,
  textMuted: '#55635A',
  textInverse: palette.white,
  primary: palette.basil,
  primaryPressed: palette.basilDeep,
  primaryTint: palette.basilTint,
  onPrimary: palette.white,
  accent: palette.beet,
  accentTint: palette.beetTint,
  danger: '#B3261E',
  success: palette.basil,
  star: palette.turmeric,
  overlay: 'rgba(20, 32, 26, 0.45)',
  vegan: palette.basil,
  veganTint: palette.basilTint,
  vegetarian: '#9A6A00',
  vegetarianTint: palette.turmericTint,
  vegFriendly: palette.slate,
  vegFriendlyTint: palette.slateTint,
  allergen: palette.beet,
  allergenTint: palette.beetTint,
  health: palette.sky,
  healthTint: palette.skyTint,
  religious: '#6B4FA0',
  religiousTint: '#E9E2F4',
};

export const darkColors: ThemeColors = {
  background: '#0F1612',
  surface: '#17211B',
  surfaceRaised: '#1F2B24',
  border: '#2C3A31',
  text: '#E8EFE9',
  textMuted: '#A3B2A8',
  textInverse: palette.ink,
  primary: '#5DBB8A',
  primaryPressed: '#4AA576',
  primaryTint: '#1D3A2B',
  onPrimary: '#06200F',
  accent: '#F07AA8',
  accentTint: '#3D1A2A',
  danger: '#F2B8B5',
  success: '#5DBB8A',
  star: '#F2C14E',
  overlay: 'rgba(0, 0, 0, 0.6)',
  vegan: '#5DBB8A',
  veganTint: '#1D3A2B',
  vegetarian: '#F2C14E',
  vegetarianTint: '#3A2F12',
  vegFriendly: '#A9BAC2',
  vegFriendlyTint: '#263238',
  allergen: '#F07AA8',
  allergenTint: '#3D1A2A',
  health: '#8DBDE8',
  healthTint: '#1C2E40',
  religious: '#C3AEEA',
  religiousTint: '#2D2440',
};

export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  heavy: 'BricolageGrotesque_800ExtraBold',
} as const;

// Modular scale (~1.2) anchored at 16px body.
export const type = {
  display: { fontFamily: fonts.heavy, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
} as const;

export type TypeVariant = keyof typeof type;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

// Radii follow hierarchy: photos are soft, controls are pills, stickers are circles.
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

/** On web, native tabs render as a floating bar at the top; tab screens leave room for it. */
export const TAB_TOP_OFFSET = Platform.OS === 'web' ? 64 : 0;
