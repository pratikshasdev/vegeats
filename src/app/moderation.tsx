import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useModerate, useModerationQueue, useResolveReport } from '@/api/moderation';
import { friendlyError } from '@/api/query-client';
import { REPORT_REASONS } from '@/api/reports';
import { Button } from '@/components/ui/button';
import { Chip, TagPill } from '@/components/ui/chip';
import { DietLabel } from '@/components/ui/diet-sticker';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { formatPrice, formatRelativeDate, fullAddress } from '@/lib/format';
import { tagColors, tagLabel } from '@/lib/tags';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type Tab = 'restaurants' | 'dishes' | 'photos' | 'reports';

export default function ModerationScreen() {
  const { colors } = useTheme();
  const { user, isAdmin, loading } = useAuth();
  const queue = useModerationQueue(isAdmin);
  const moderate = useModerate();
  const resolve = useResolveReport();
  const [tab, setTab] = useState<Tab>('restaurants');

  if (!loading && !isAdmin) return <Redirect href="/profile" />;

  const act = (fn: () => Promise<unknown>) => fn().catch((e) => Alert.alert('Action failed', friendlyError(e)));
  const decide = (table: 'restaurants' | 'dishes' | 'photos', id: string) => (
    <View style={styles.actions}>
      <Button label="Approve" size="sm" icon="checkmark" onPress={() => act(() => moderate.mutateAsync({ table, id, status: 'approved' }))} />
      <Button label="Reject" size="sm" variant="danger" onPress={() => act(() => moderate.mutateAsync({ table, id, status: 'rejected' }))} />
    </View>
  );

  const q = queue.data;
  const counts: Record<Tab, number> = {
    restaurants: q?.restaurants.length ?? 0,
    dishes: q?.dishes.length ?? 0,
    photos: q?.photos.length ?? 0,
    reports: q?.reports.length ?? 0,
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {(['restaurants', 'dishes', 'photos', 'reports'] as Tab[]).map((t) => (
          <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} badge={counts[t]} selected={tab === t} onPress={() => setTab(t)} />
        ))}
      </ScrollView>
      {queue.isError && <ErrorBanner message={friendlyError(queue.error)} onRetry={() => queue.refetch()} />}
      {queue.isPending && <Skeleton style={{ height: 120 }} />}
      {q && counts[tab] === 0 && <EmptyState icon="checkmark-done-outline" title="All caught up" body="Nothing is waiting in this queue." />}

      {q && tab === 'restaurants' &&
        q.restaurants.map((r) => (
          <View key={r.id} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="heading">{r.name}</Text>
            <DietLabel level={r.diet_level} />
            <Text variant="small">{fullAddress(r)}</Text>
            {r.cuisines.length > 0 && <Text variant="small" tone="muted">{r.cuisines.join(', ')}</Text>}
            <View style={styles.wrap}>
              {r.tags.map((t) => (
                <TagPill key={t} size="xs" label={tagLabel(t)} color={tagColors(t, colors)} />
              ))}
            </View>
            {r.description && <Text variant="small">{r.description}</Text>}
            <Text variant="caption" tone="muted">
              Submitted {formatRelativeDate(r.created_at)}
            </Text>
            <Button label="Open listing" size="sm" variant="ghost" onPress={() => router.push(`/restaurant/${r.id}`)} />
            {decide('restaurants', r.id)}
          </View>
        ))}

      {q && tab === 'dishes' &&
        q.dishes.map((d) => (
          <View key={d.id} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="heading">{d.name}</Text>
            <Text variant="small" tone="muted">
              {d.restaurants?.name} / {d.category} {d.price_cents != null ? `/ ${formatPrice(d.price_cents)}` : ''}
            </Text>
            {d.description && <Text variant="small">{d.description}</Text>}
            <View style={styles.wrap}>
              {d.tags.map((t) => (
                <TagPill key={t} size="xs" label={tagLabel(t)} color={tagColors(t, colors)} />
              ))}
            </View>
            {decide('dishes', d.id)}
          </View>
        ))}

      {q && tab === 'photos' &&
        q.photos.map((p) => (
          <View key={p.id} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Image source={{ uri: p.url }} style={styles.photo} contentFit="cover" />
            <Text variant="smallStrong">
              {p.restaurants?.name} / {p.kind}
            </Text>
            {p.caption && <Text variant="small">{p.caption}</Text>}
            {decide('photos', p.id)}
          </View>
        ))}

      {q && tab === 'reports' &&
        q.reports.map((rep) => (
          <View key={rep.id} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="heading">{REPORT_REASONS.find((r) => r.value === rep.reason)?.label ?? rep.reason}</Text>
            <Text variant="small" tone="muted">
              On a {rep.target_type}, {formatRelativeDate(rep.created_at)}
            </Text>
            {rep.details && <Text>{rep.details}</Text>}
            {rep.target_type === 'restaurant' && (
              <Button label="Open listing" size="sm" variant="ghost" onPress={() => router.push(`/restaurant/${rep.target_id}`)} />
            )}
            <View style={styles.actions}>
              <Button
                label="Mark fixed"
                size="sm"
                onPress={() => act(() => resolve.mutateAsync({ id: rep.id, adminId: user!.id, status: 'resolved' }))}
              />
              <Button
                label="Dismiss"
                size="sm"
                variant="secondary"
                onPress={() => act(() => resolve.mutateAsync({ id: rep.id, adminId: user!.id, status: 'dismissed' }))}
              />
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, borderRadius: radius.lg, gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
});
