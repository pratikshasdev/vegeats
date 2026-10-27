import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { friendlyError } from '@/api/query-client';
import { useRestaurant } from '@/api/restaurants';
import { useDeleteReview, useMyReview, useSaveReview } from '@/api/reviews';
import { FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/feedback';
import { ratingLabel, StarInput } from '@/components/ui/stars';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme/tokens';

const MAX_BODY = 2000;

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const existing = useMyReview(id, user?.id);

  if (!user) return <Redirect href={{ pathname: '/sign-in', params: { reason: 'Sign in to write a review' } }} />;
  if (existing.isPending) return null;
  // Keyed so the form re-initialises if an existing review loads later.
  return <ReviewForm key={existing.data?.id ?? 'new'} restaurantId={id} userId={user.id} existing={existing.data ?? null} />;
}

function ReviewForm({
  restaurantId: id,
  userId,
  existing,
}: {
  restaurantId: string;
  userId: string;
  existing: { id: string; rating: number; body: string | null } | null;
}) {
  const restaurant = useRestaurant(id);
  const save = useSaveReview();
  const remove = useDeleteReview();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (rating < 1) return setError('Choose a star rating first.');
    try {
      await save.mutateAsync({ restaurantId: id, userId, rating, body });
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete your review?', 'This removes your rating and comments.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync({ id: existing!.id, restaurantId: id });
            router.back();
          } catch (e) {
            setError(friendlyError(e));
          }
        },
      },
    ]);

  return (
    <FormScreen
      testID="review-form"
      footer={
        <View style={{ gap: space.sm }}>
          <Button testID="save-review" label={existing ? 'Update review' : 'Post review'} onPress={submit} loading={save.isPending} fullWidth />
          {existing && <Button label="Delete review" variant="danger" onPress={confirmDelete} loading={remove.isPending} fullWidth />}
        </View>
      }>
      <View style={{ gap: space.xs }}>
        <Text variant="title">{restaurant.data?.name ?? 'Review'}</Text>
        <Text tone="muted">How were the vegan and vegetarian options?</Text>
      </View>
      <View style={{ gap: space.sm, alignItems: 'flex-start' }}>
        <StarInput value={rating} onChange={setRating} />
        <Text variant="smallStrong" tone="muted">
          {rating ? ratingLabel(rating) : 'Tap a star to rate'}
        </Text>
      </View>
      <TextField
        testID="review-body"
        label="Your review (optional)"
        placeholder="What did you order? Were staff clear about ingredients and allergens?"
        value={body}
        onChangeText={(t) => setBody(t.slice(0, MAX_BODY))}
        multiline
        hint={`${body.length}/${MAX_BODY}`}
      />
      {error && <ErrorBanner message={error} />}
    </FormScreen>
  );
}
