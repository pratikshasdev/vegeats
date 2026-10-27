import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { friendlyError } from '@/api/query-client';
import { reasonsFor, type ReportReason, type ReportTarget, useSubmitReport } from '@/api/reports';
import { FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorBanner } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const TARGET_COPY: Record<ReportTarget, string> = {
  restaurant: 'this listing',
  dish: 'this dish',
  review: 'this review',
  photo: 'this photo',
};

export default function ReportScreen() {
  const { targetType, targetId } = useLocalSearchParams<{ targetType: ReportTarget; targetId: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const submit = useSubmitReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!user) return <Redirect href={{ pathname: '/sign-in', params: { reason: 'Sign in to report a problem' } }} />;
  if (!targetType || !targetId) {
    return <EmptyState icon="alert-circle-outline" title="Nothing to report" body="Open a listing and try again." />;
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="checkmark-circle-outline"
          title="Report sent"
          body="A moderator will check it. Thanks for keeping VegEats accurate for people with restrictions."
          actionLabel="Done"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const onSubmit = async () => {
    if (!reason) return setError('Choose what is wrong.');
    if (reason === 'other' && !details.trim()) return setError('Describe the problem so a moderator can fix it.');
    setError(null);
    try {
      await submit.mutateAsync({ userId: user.id, targetType, targetId, reason, details });
      setSent(true);
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <FormScreen footer={<Button testID="send-report" label="Send report" onPress={onSubmit} loading={submit.isPending} fullWidth />}>
      <Text variant="title">What’s wrong with {TARGET_COPY[targetType]}?</Text>
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {reasonsFor(targetType).map((r) => {
          const selected = reason === r.value;
          return (
            <Pressable
              key={r.value}
              testID={`reason-${r.value}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setReason(r.value)}
              style={[
                styles.option,
                { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primaryTint : colors.surface },
              ]}>
              <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} color={selected ? colors.primary : colors.textMuted} />
              <Text variant={selected ? 'bodyStrong' : 'body'}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextField
        testID="report-details"
        label={reason === 'other' ? 'Details' : 'Details (optional)'}
        placeholder="For example: the menu says the curry contains ghee"
        value={details}
        onChangeText={(t) => setDetails(t.slice(0, 1000))}
        multiline
      />
      {error && <ErrorBanner message={error} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5 },
});
