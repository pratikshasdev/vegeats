import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { queryClient } from '@/api/query-client';
import { AuthProvider } from '@/providers/auth-provider';
import { useApplyThemePreference, useTheme } from '@/theme/theme';
import { fonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  useApplyThemePreference();
  const { colors, scheme } = useTheme();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  const modal = { presentation: 'modal' as const, headerShown: true };
  const sheet = {
    presentation: 'formSheet' as const,
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.6, 1],
    headerShown: false,
  };

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border },
      }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fonts.bold, color: colors.text },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="restaurant/[id]/index" options={{ headerTransparent: true, title: '' }} />
        <Stack.Screen name="restaurant/[id]/review" options={{ ...modal, title: 'Your review' }} />
        <Stack.Screen name="restaurant/[id]/add-dish" options={{ ...modal, title: 'Add a dish' }} />
        <Stack.Screen name="restaurant/[id]/add-photo" options={{ ...modal, title: 'Add a photo' }} />
        <Stack.Screen name="report" options={{ ...modal, title: 'Report a problem' }} />
        <Stack.Screen name="add-restaurant" options={{ ...modal, title: 'Add a restaurant' }} />
        <Stack.Screen name="sign-in" options={{ ...modal, title: '' }} />
        <Stack.Screen name="diet-preferences" options={{ ...modal, title: 'Your diet' }} />
        <Stack.Screen name="filters" options={sheet} />
        <Stack.Screen name="location" options={{ ...sheet, sheetAllowedDetents: [0.7] }} />
        <Stack.Screen name="delete-account" options={{ ...modal, title: 'Delete account' }} />
        <Stack.Screen name="moderation" options={{ title: 'Review queue' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
