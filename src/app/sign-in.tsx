import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { friendlyError } from '@/api/query-client';
import { FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { ErrorBanner, Notice } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { hasErrors, isEmail, validateSignIn, validateSignUp } from '@/lib/validation';
import { type OAuthProvider, useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type Mode = 'sign-in' | 'sign-up' | 'reset';

export default function SignInScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { colors, scheme } = useTheme();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | OAuthProvider | null>(null);
  const [appleNative, setAppleNative] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleNative).catch(() => setAppleNative(false));
  }, []);

  // Close as soon as a session exists (email, OAuth or a confirmed link).
  useEffect(() => {
    if (auth.user && router.canGoBack()) router.back();
  }, [auth.user]);

  const run = async (kind: 'email' | OAuthProvider, fn: () => Promise<void>) => {
    setFormError(null);
    setInfo(null);
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      const msg = friendlyError(e);
      setFormError(/Invalid login credentials/i.test(msg) ? 'That email and password don’t match. Try again or reset your password.' : msg);
    } finally {
      setBusy(null);
    }
  };

  const submitEmail = () => {
    if (mode === 'reset') {
      if (!isEmail(email)) return setErrors({ email: 'Enter a valid email address.' });
      setErrors({});
      return run('email', async () => {
        await auth.sendPasswordReset(email);
        setInfo(`We sent a reset link to ${email.trim()}. Open it on this device.`);
      });
    }
    const e = mode === 'sign-up' ? validateSignUp({ name, email, password }) : validateSignIn({ email, password });
    setErrors(e);
    if (hasErrors(e)) return;
    return run('email', async () => {
      if (mode === 'sign-up') {
        const { needsConfirmation } = await auth.signUpWithEmail(email, password, name);
        if (needsConfirmation) setInfo(`Check ${email.trim()} for a link to confirm your account, then come back and sign in.`);
      } else {
        await auth.signInWithEmail(email, password);
      }
    });
  };

  const social = (p: OAuthProvider) => run(p, async () => void (await auth.signInWithProvider(p)));

  const title = mode === 'sign-up' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to VegEats';
  const cta = mode === 'sign-up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in';

  return (
    <FormScreen testID="sign-in-screen">
      <View style={{ gap: space.xs }}>
        <Text variant="title">{title}</Text>
        <Text tone="muted">
          {reason ?? 'Save your diet, write reviews, and add dishes and photos for others.'}
        </Text>
      </View>

      {mode !== 'reset' && (
        <View style={{ gap: space.sm }}>
          {appleNative ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={mode === 'sign-up' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.pill}
              style={{ height: 50 }}
              onPress={() => social('apple')}
            />
          ) : (
            <Button label="Continue with Apple" icon="logo-apple" variant="secondary" onPress={() => social('apple')} loading={busy === 'apple'} fullWidth />
          )}
          <Button
            testID="google-sign-in"
            label="Continue with Google"
            icon="logo-google"
            variant="secondary"
            onPress={() => social('google')}
            loading={busy === 'google'}
            fullWidth
          />
          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text variant="small" tone="muted">
              or use email
            </Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>
        </View>
      )}

      <View style={{ gap: space.md }}>
        {mode === 'sign-up' && (
          <TextField testID="name-input" label="Name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" textContentType="name" />
        )}
        <TextField
          testID="email-input"
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        {mode !== 'reset' && (
          <TextField
            testID="password-input"
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
            hint={mode === 'sign-up' ? 'At least 8 characters with a letter and a number' : undefined}
            onSubmitEditing={submitEmail}
          />
        )}
        {formError && <ErrorBanner message={formError} />}
        {info && <Notice icon="mail-outline">{info}</Notice>}
        <Button testID="email-submit" label={cta} onPress={submitEmail} loading={busy === 'email'} fullWidth />
      </View>

      <View style={{ gap: space.sm, alignItems: 'center' }}>
        {mode === 'sign-in' && (
          <>
            <LinkText testID="go-sign-up" onPress={() => setMode('sign-up')}>New to VegEats? Create an account</LinkText>
            <LinkText onPress={() => setMode('reset')}>Forgot your password?</LinkText>
          </>
        )}
        {mode !== 'sign-in' && <LinkText onPress={() => setMode('sign-in')}>Already have an account? Sign in</LinkText>}
      </View>
    </FormScreen>
  );
}

function LinkText({ children, onPress, testID }: { children: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} testID={testID}>
      <Text variant="smallStrong" tone="primary">
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xs },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
});
