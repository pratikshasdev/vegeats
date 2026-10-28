import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useContributions, useUpdateProfile } from '@/api/profile';
import { friendlyError } from '@/api/query-client';
import { Avatar } from '@/components/review-item';
import { Button } from '@/components/ui/button';
import { Chip, TagPill } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Stars } from '@/components/ui/stars';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { tagColors, tagLabel } from '@/lib/tags';
import { useAuth } from '@/providers/auth-provider';
import { type ThemePreference, usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme/theme';
import { radius, space, TAB_TOP_OFFSET } from '@/theme/tokens';

const STATUS_LABEL = { pending: 'Pending review', approved: 'Live', rejected: 'Not approved' } as const;

function Row({ icon, label, detail, onPress, testID }: { icon: IconName; label: string; detail?: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.primaryTint : colors.surface }]}>
      <Icon name={icon} color={colors.primary} />
      <Text style={{ flex: 1 }}>{label}</Text>
      {detail && (
        <Text variant="small" tone="muted">
          {detail}
        </Text>
      )}
      <Icon name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const { theme, setTheme, dietTags } = usePreferences();
  const contributions = useContributions(user?.id);
  const update = useUpdateProfile();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');

  const c = contributions.data;
  const pendingCount = c ? [...c.restaurants, ...c.dishes, ...c.photos].filter((x) => x.status === 'pending').length : 0;

  const saveName = async () => {
    if (!user || !name.trim()) return;
    try {
      await update.mutateAsync({ userId: user.id, patch: { display_name: name.trim().slice(0, 60) } });
      await refreshProfile();
      setEditingName(false);
    } catch (e) {
      Alert.alert("Couldn't save your name", friendlyError(e));
    }
  };

  return (
    <ScrollView
      testID="profile-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.lg + TAB_TOP_OFFSET, paddingBottom: insets.bottom + 100, gap: space.xl }}>
      {user ? (
        <View style={styles.head}>
          <Avatar name={profile?.display_name ?? user.email ?? '?'} url={profile?.avatar_url} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            {editingName ? (
              <View style={{ gap: space.sm }}>
                <TextField value={name} onChangeText={setName} autoFocus accessibilityLabel="Display name" onSubmitEditing={saveName} />
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button label="Save" size="sm" onPress={saveName} loading={update.isPending} />
                  <Button label="Cancel" size="sm" variant="ghost" onPress={() => setEditingName(false)} />
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit display name"
                onPress={() => {
                  setName(profile?.display_name ?? '');
                  setEditingName(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="title" numberOfLines={1}>
                  {profile?.display_name ?? 'You'}
                </Text>
                <Icon name="pencil" size={16} color={colors.textMuted} />
              </Pressable>
            )}
            <Text variant="small" tone="muted">
              {user.email}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.primary }]}>
          <Text variant="title" color={colors.onPrimary}>
            Join the VegEats community
          </Text>
          <Text color={colors.onPrimary} style={{ opacity: 0.9 }}>
            Sign in to review places, add dishes and menu photos, and keep your diet settings on every device.
          </Text>
          <Button testID="profile-sign-in" label="Sign in or create account" variant="secondary" onPress={() => router.push('/sign-in')} />
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <View style={styles.sectionHead}>
          <Text variant="heading">Your diet</Text>
          <Button testID="edit-diet" label="Edit" size="sm" variant="ghost" onPress={() => router.push('/diet-preferences')} />
        </View>
        {dietTags.length ? (
          <View style={styles.wrap}>
            {dietTags.map((t) => (
              <TagPill key={t} label={tagLabel(t)} color={tagColors(t, colors)} />
            ))}
          </View>
        ) : (
          <Text tone="muted">Not set. Add your diet to see which dishes fit at a glance.</Text>
        )}
      </View>

      {user && c && (
        <View style={{ gap: space.sm }}>
          <Text variant="heading">Your contributions</Text>
          <View style={styles.stats}>
            {[
              ['Reviews', c.reviews.length],
              ['Places', c.restaurants.length],
              ['Dishes', c.dishes.length],
              ['Photos', c.photos.length],
            ].map(([label, n]) => (
              <View key={label} style={[styles.stat, { backgroundColor: colors.surface }]}>
                <Text variant="title">{n}</Text>
                <Text variant="caption" tone="muted">
                  {label}
                </Text>
              </View>
            ))}
          </View>
          {pendingCount > 0 && (
            <Text variant="small" tone="muted">
              {pendingCount} waiting for review
            </Text>
          )}
          {[...c.restaurants.map((x) => ({ ...x, label: x.name, kind: 'Place', rid: x.id })),
            ...c.dishes.map((x) => ({ ...x, label: x.name, kind: 'Dish', rid: x.restaurant_id }))]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 6)
            .map((x) => (
              <Pressable key={x.id} onPress={() => router.push(`/restaurant/${x.rid}`)} style={[styles.contrib, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {x.label}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {x.kind}
                  </Text>
                </View>
                <TagPill
                  label={STATUS_LABEL[x.status]}
                  color={
                    x.status === 'approved'
                      ? { fg: colors.vegan, bg: colors.veganTint }
                      : x.status === 'rejected'
                        ? { fg: colors.danger, bg: colors.accentTint }
                        : { fg: colors.textMuted, bg: colors.border }
                  }
                />
              </Pressable>
            ))}
          {c.reviews.slice(0, 3).map((rv) => (
            <Pressable key={rv.id} onPress={() => router.push(`/restaurant/${rv.restaurant_id}`)} style={[styles.contrib, { borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {rv.restaurants?.name ?? 'Restaurant'}
                </Text>
                <Stars value={rv.rating} size={12} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Text variant="heading">Appearance</Text>
        <View style={styles.wrap}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((t) => (
            <Chip
              key={t}
              testID={`theme-${t}`}
              label={t === 'system' ? 'Match device' : t === 'light' ? 'Light' : 'Dark'}
              icon={t === 'system' ? 'phone-portrait-outline' : t === 'light' ? 'sunny-outline' : 'moon-outline'}
              selected={theme === t}
              onPress={() => setTheme(t)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.group, { borderColor: colors.border }]}>
        <Row testID="add-restaurant" icon="add-circle-outline" label="Add a restaurant" onPress={() => router.push('/add-restaurant')} />
        {isAdmin && <Row testID="open-moderation" icon="shield-checkmark-outline" label="Review queue" onPress={() => router.push('/moderation')} />}
      </View>

      {user && (
        <Button
          testID="sign-out"
          label="Sign out"
          variant="danger"
          onPress={() =>
            Alert.alert('Sign out?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => signOut().catch((e) => Alert.alert('Sign out failed', friendlyError(e))) },
            ])
          }
        />
      )}
      {user && (
        <Button
          testID="delete-account"
          label="Delete account"
          variant="ghost"
          onPress={() => router.push('/delete-account')}
          accessibilityHint="Permanently deletes your account, reviews and photos"
        />
      )}
      <Text variant="caption" tone="muted" align="center">
        VegEats {Constants.expoConfig?.version ?? ''}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  card: { padding: space.xl, borderRadius: radius.lg, gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.md },
  contrib: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  group: { borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 54 },
});
