import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useContributions } from '@/api/profile';
import { FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorBanner } from '@/components/ui/feedback';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

export const CONFIRM_WORD = 'DELETE';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Line({ icon, color, children }: { icon: IconName; color: string; children: string }) {
  return (
    <View style={styles.line}>
      <Icon name={icon} size={18} color={color} />
      <Text style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const { user, deleteAccount } = useAuth();
  const contributions = useContributions(user?.id);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="checkmark-circle-outline"
          title="Your account is deleted"
          body="Your sign-in, reviews and photos are gone. You can keep browsing VegEats without an account."
          actionLabel="Done"
          onAction={() => router.dismissTo('/profile')}
        />
      </View>
    );
  }
  if (!user) return <Redirect href="/profile" />;

  const c = contributions.data;
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const onDelete = async () => {
    if (!confirmed) return setError(`Type ${CONFIRM_WORD} to confirm.`);
    setError(null);
    setBusy(true);
    try {
      await deleteAccount();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScreen
      footer={
        <Button
          testID="confirm-delete-account"
          label="Delete my account"
          variant="danger"
          onPress={onDelete}
          loading={busy}
          disabled={!confirmed}
          fullWidth
        />
      }>
      <Text variant="title">Delete your account?</Text>
      <Text tone="muted">This is permanent and can&apos;t be undone. You&apos;re signed in as {user.email ?? 'this account'}.</Text>

      <View style={[styles.box, { backgroundColor: colors.accentTint }]}>
        <Text variant="bodyStrong">Deleted</Text>
        <Line icon="trash-outline" color={colors.danger}>
          Your sign-in, name and diet settings saved to your account
        </Line>
        <Line icon="trash-outline" color={colors.danger}>
          {c ? `${plural(c.reviews.length, 'review')} and ${plural(c.photos.length, 'photo')}` : 'Your reviews and photos'}
        </Line>
        <Line icon="trash-outline" color={colors.danger}>
          Reports you sent to moderators
        </Line>
      </View>

      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
        <Text variant="bodyStrong">Kept, without your name</Text>
        <Line icon="storefront-outline" color={colors.textMuted}>
          {c
            ? `${plural(c.restaurants.length, 'restaurant')} and ${plural(c.dishes.length, 'dish', 'dishes')} you added, so others can still find them`
            : 'Restaurants and dishes you added, so others can still find them'}
        </Line>
      </View>

      <TextField
        testID="delete-confirm-input"
        label={`Type ${CONFIRM_WORD} to confirm`}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
      />
      {error && <ErrorBanner message={error} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  box: { padding: space.lg, borderRadius: radius.md, gap: space.sm },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
