import * as Location from 'expo-location';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { friendlyError } from '@/api/query-client';
import { useSubmitRestaurant } from '@/api/restaurants';
import { FormScreen } from '@/components/form-screen';
import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState, ErrorBanner, Notice } from '@/components/ui/feedback';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { DIET_LEVELS, type DietLevel } from '@/lib/tags';
import { hasErrors, type RestaurantFormValues, validateRestaurant } from '@/lib/validation';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme/tokens';

const EMPTY: RestaurantFormValues = {
  name: '',
  addressLine: '',
  city: '',
  region: 'MI',
  postalCode: '',
  phone: '',
  website: '',
  description: '',
};

export default function AddRestaurantScreen() {
  const { user } = useAuth();
  const submit = useSubmitRestaurant();
  const [values, setValues] = useState(EMPTY);
  const [dietLevel, setDietLevel] = useState<DietLevel>('veg_friendly');
  const [tags, setTags] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateRestaurant>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  if (!user) return <Redirect href={{ pathname: '/sign-in', params: { reason: 'Sign in to add a restaurant' } }} />;

  const set = (k: keyof RestaurantFormValues, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const fillFromLocation = async () => {
    setServerError(null);
    setFilling(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location is off. Type the address instead, or turn location on in Settings.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [addr] = await Location.reverseGeocodeAsync(pos.coords);
      if (!addr) throw new Error("Couldn't find an address here. Type it instead.");
      setValues((s) => ({
        ...s,
        addressLine: [addr.streetNumber, addr.street].filter(Boolean).join(' ') || addr.name || s.addressLine,
        city: addr.city ?? s.city,
        region: addr.region && addr.region.length === 2 ? addr.region : s.region,
        postalCode: addr.postalCode ?? s.postalCode,
      }));
    } catch (e) {
      setServerError(friendlyError(e));
    } finally {
      setFilling(false);
    }
  };

  const onSubmit = async () => {
    const e = validateRestaurant(values);
    setErrors(e);
    setServerError(null);
    if (hasErrors(e)) return;
    try {
      const address = `${values.addressLine}, ${values.city}, ${values.region} ${values.postalCode}`.trim();
      const [geo] = await Location.geocodeAsync(address);
      if (!geo) throw new Error("We couldn't find that address on the map. Check the street and city.");
      const id = await submit.mutateAsync({
        name: values.name,
        addressLine: values.addressLine,
        city: values.city,
        region: values.region.toUpperCase(),
        postalCode: values.postalCode,
        lat: geo.latitude,
        lng: geo.longitude,
        dietLevel,
        tags,
        cuisines: cuisine.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 4),
        description: values.description,
        phone: values.phone,
        website: values.website,
      });
      setDoneId(id);
    } catch (err) {
      setServerError(friendlyError(err));
    }
  };

  if (doneId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="checkmark-circle-outline"
          title="Thanks, it's submitted"
          body="A moderator will check the details. You can add dishes and menu photos now; they'll go live once approved."
          actionLabel="Open the listing"
          onAction={() => router.replace(`/restaurant/${doneId}`)}
        />
      </View>
    );
  }

  return (
    <FormScreen
      testID="add-restaurant-form"
      footer={<Button testID="submit-restaurant" label="Submit restaurant" onPress={onSubmit} loading={submit.isPending} fullWidth />}>
      <Notice>New places are reviewed before they appear for everyone, usually within a day.</Notice>
      <TextField testID="restaurant-name-input" label="Name" value={values.name} onChangeText={(t) => set('name', t)} error={errors.name} />
      <View style={{ gap: space.md }}>
        <View style={styles.headRow}>
          <Text variant="heading">Address</Text>
          <Button label="Use my location" icon="locate" size="sm" variant="ghost" onPress={fillFromLocation} loading={filling} />
        </View>
        <TextField label="Street address" value={values.addressLine} onChangeText={(t) => set('addressLine', t)} error={errors.addressLine} autoComplete="street-address" />
        <TextField label="City" value={values.city} onChangeText={(t) => set('city', t)} error={errors.city} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField label="State" value={values.region} onChangeText={(t) => set('region', t.toUpperCase().slice(0, 2))} error={errors.region} autoCapitalize="characters" />
          </View>
          <View style={{ flex: 1.4 }}>
            <TextField label="ZIP" value={values.postalCode} onChangeText={(t) => set('postalCode', t)} error={errors.postalCode} keyboardType="number-pad" />
          </View>
        </View>
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="heading">How plant-based is it?</Text>
        <View style={styles.wrap}>
          {DIET_LEVELS.map((d) => (
            <Chip key={d.value} label={d.label} selected={dietLevel === d.value} onPress={() => setDietLevel(d.value)} />
          ))}
        </View>
        <Text variant="small" tone="muted">
          {DIET_LEVELS.find((d) => d.value === dietLevel)?.description}
        </Text>
      </View>
      <TextField label="Cuisine (optional)" placeholder="Indian, Thai" value={cuisine} onChangeText={setCuisine} hint="Separate with commas" />
      <View style={{ gap: space.sm }}>
        <Text variant="heading">Options they offer</Text>
        <TagPicker selected={tags} onToggle={(s) => setTags((t) => (t.includes(s) ? t.filter((x) => x !== s) : [...t, s]))} />
      </View>
      <TextField label="Phone (optional)" value={values.phone} onChangeText={(t) => set('phone', t)} error={errors.phone} keyboardType="phone-pad" />
      <TextField label="Website (optional)" value={values.website} onChangeText={(t) => set('website', t)} error={errors.website} autoCapitalize="none" keyboardType="url" />
      <TextField label="Anything else? (optional)" value={values.description} onChangeText={(t) => set('description', t.slice(0, 2000))} multiline />
      {serverError && <ErrorBanner message={serverError} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
