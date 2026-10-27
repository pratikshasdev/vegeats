import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SUGGESTED_CATEGORIES, useSubmitDish } from '@/api/menu';
import { friendlyError } from '@/api/query-client';
import { useRestaurant } from '@/api/restaurants';
import { FormScreen } from '@/components/form-screen';
import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner, Notice } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { parsePriceToCents } from '@/lib/format';
import { type DishFormValues, hasErrors, validateDish } from '@/lib/validation';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme/tokens';

export default function AddDishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const restaurant = useRestaurant(id);
  const submit = useSubmitDish();
  const [values, setValues] = useState<DishFormValues>({ name: '', description: '', category: 'Mains', price: '', tags: [] });
  const [errors, setErrors] = useState<ReturnType<typeof validateDish>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  if (!user) return <Redirect href={{ pathname: '/sign-in', params: { reason: 'Sign in to add dishes' } }} />;

  const set = <K extends keyof DishFormValues>(k: K, v: DishFormValues[K]) => setValues((s) => ({ ...s, [k]: v }));

  const onSubmit = async () => {
    const e = validateDish(values);
    setErrors(e);
    setServerError(null);
    if (hasErrors(e)) return;
    try {
      await submit.mutateAsync({
        restaurantId: id,
        name: values.name,
        description: values.description,
        category: values.category,
        priceCents: parsePriceToCents(values.price),
        tags: values.tags,
      });
      router.back();
    } catch (err) {
      setServerError(friendlyError(err));
    }
  };

  return (
    <FormScreen
      testID="add-dish-form"
      footer={<Button testID="submit-dish" label="Submit dish" onPress={onSubmit} loading={submit.isPending} fullWidth />}>
      <View style={{ gap: space.xs }}>
        <Text variant="title">{restaurant.data?.name ?? 'Add a dish'}</Text>
        <Text tone="muted">Add a dish you’ve seen on the menu. A moderator checks it before it appears for everyone.</Text>
      </View>
      <TextField
        testID="dish-name"
        label="Dish name"
        placeholder="Chickpea tikka masala"
        value={values.name}
        onChangeText={(t) => set('name', t)}
        error={errors.name}
      />
      <View style={{ gap: space.sm }}>
        <Text variant="smallStrong">Menu section</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {SUGGESTED_CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={values.category === c} onPress={() => set('category', c)} />
          ))}
        </ScrollView>
        <TextField
          placeholder="Or type a section name"
          value={values.category}
          onChangeText={(t) => set('category', t)}
          error={errors.category}
        />
      </View>
      <TextField
        testID="dish-price"
        label="Price (optional)"
        placeholder="14.00"
        keyboardType="decimal-pad"
        value={values.price}
        onChangeText={(t) => set('price', t)}
        error={errors.price}
      />
      <TextField
        label="Description (optional)"
        placeholder="Ingredients, how it's prepared, what to ask for"
        value={values.description}
        onChangeText={(t) => set('description', t.slice(0, 1000))}
        multiline
      />
      <View style={styles.gap}>
        <Text variant="heading">What does it fit?</Text>
        <Notice>Only mark what the menu or staff confirmed. People with allergies rely on these tags.</Notice>
        <TagPicker
          selected={values.tags}
          onToggle={(slug) => set('tags', values.tags.includes(slug) ? values.tags.filter((t) => t !== slug) : [...values.tags, slug])}
          showDescriptions
        />
        {errors.tags && (
          <Text variant="small" tone="danger">
            {errors.tags}
          </Text>
        )}
      </View>
      {serverError && <ErrorBanner message={serverError} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({ gap: { gap: space.md } });
