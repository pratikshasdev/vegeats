import type { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'VegEats (Dev)' : 'VegEats',
  slug: 'vegeats',
  owner: process.env.EXPO_OWNER || undefined,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'vegeats',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: IS_DEV ? 'com.pratikshasdev.vegeats.dev' : 'com.pratikshasdev.vegeats',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: IS_DEV ? 'com.pratikshasdev.vegeats.dev' : 'com.pratikshasdev.vegeats',
    adaptiveIcon: {
      backgroundColor: '#EEF2EC',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      // Maps SDK for Android key (restricted to this package + SHA-1). See docs/SETUP.md.
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '' },
    },
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#17583A',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: '#0F1612', image: './assets/images/splash-icon.png' },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'VegEats uses your location to show vegan and vegetarian restaurants near you.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'VegEats lets you choose photos of menus and dishes to share with the community.',
        cameraPermission: 'VegEats lets you take photos of menus and dishes to share with the community.',
        microphonePermission: false,
      },
    ],
    'expo-apple-authentication',
    'expo-sqlite',
    'expo-maps',
    'expo-web-browser',
    [
      'expo-font',
      { fonts: ['./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'] },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID || undefined },
  },
});
