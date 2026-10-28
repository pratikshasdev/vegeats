import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { fetchProfile, type Profile } from '@/api/profile';
import { queryClient, queryKeys } from '@/api/query-client';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/stores/preferences';

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'apple';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithProvider: (provider: OAuthProvider) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Permanently deletes the account and its reviews and photos, then signs out on this device. */
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Pull the `{ error }` message out of an Edge Function error response when there is one. */
export async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (context?.json) {
    try {
      const body = (await context.json()) as { error?: string } | null;
      if (body?.error) return body.error;
    } catch {
      // Not JSON; fall through to the generic message.
    }
  }
  return (error as Error | null)?.message ?? 'Something went wrong. Try again.';
}

export const AUTH_REDIRECT_PATH = 'auth/callback';

export function authRedirectUrl(): string {
  return Linking.createURL(AUTH_REDIRECT_PATH);
}

/** Pull ?code= (PKCE) or #access_token= out of an OAuth redirect URL and create the session. */
export async function completeOAuthRedirect(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  const errorDescription = parsed.searchParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return true;
  }
  return false;
}

async function signInWithBrowser(provider: OAuthProvider): Promise<boolean> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  return completeOAuthRedirect(result.url);
}

async function signInWithAppleNative(): Promise<boolean> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple did not return an identity token. Try again.');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw error;
    // Apple only shares the name on first sign-in; keep it.
    const name = credential.fullName
      ? AppleAuthentication.formatFullName(credential.fullName).trim()
      : '';
    if (name) await supabase.auth.updateUser({ data: { full_name: name } });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
    if (p) queryClient.setQueryData(queryKeys.profile(userId), p);

    // Sync diet preferences: keep local picks made before signing in, otherwise adopt the profile's.
    const { dietTags, setDietTags } = usePreferences.getState();
    if (p && p.diet_preferences.length === 0 && dietTags.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .update({ diet_preferences: dietTags })
        .eq('id', userId)
        .select()
        .single();
      if (data) setProfile(data);
    } else if (p) {
      setDietTags(p.diet_preferences);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id).catch(() => undefined);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT' || !next) {
        setProfile(null);
        queryClient.removeQueries({ queryKey: ['contributions'] });
        queryClient.removeQueries({ queryKey: ['moderation'] });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Defer: calling Supabase inside this callback can deadlock the auth lock.
        setTimeout(() => loadProfile(next.user.id).catch(() => undefined), 0);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      async signInWithEmail(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      },
      async signUpWithEmail(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: displayName.trim() }, emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },
      async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() });
        if (error) throw error;
      },
      async signInWithProvider(provider) {
        if (provider === 'apple' && Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync())) {
          return signInWithAppleNative();
        }
        return signInWithBrowser(provider);
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      async deleteAccount() {
        const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
        if (error) throw new Error(await functionErrorMessage(error));
        // The server session is already gone; just clear this device.
        await supabase.auth.signOut({ scope: 'local' });
        await queryClient.invalidateQueries();
      },
      async refreshProfile() {
        if (session) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
