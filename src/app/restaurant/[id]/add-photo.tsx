import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PHOTO_KIND_LABELS, type PhotoKind, useUploadPhoto } from '@/api/photos';
import { friendlyError } from '@/api/query-client';
import { useRestaurant } from '@/api/restaurants';
import { FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type Picked = { uri: string; width: number; height: number };

export default function AddPhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const restaurant = useRestaurant(id);
  const upload = useUploadPhoto();
  const [image, setImage] = useState<Picked | null>(null);
  const [kind, setKind] = useState<PhotoKind>('menu');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href={{ pathname: '/sign-in', params: { reason: 'Sign in to add photos' } }} />;

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(
        source === 'camera'
          ? 'Camera access is off. Turn it on for VegEats in Settings to take a photo.'
          : 'Photo access is off. Turn it on for VegEats in Settings to choose a photo.',
      );
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: false };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, width: a.width, height: a.height });
    }
  };

  const submit = async () => {
    if (!image) return setError('Choose or take a photo first.');
    setError(null);
    try {
      await upload.mutateAsync({ restaurantId: id, userId: user.id, kind, caption, image });
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <FormScreen
      footer={<Button testID="upload-photo" label="Upload photo" onPress={submit} loading={upload.isPending} disabled={!image} fullWidth />}>
      <View style={{ gap: space.xs }}>
        <Text variant="title">{restaurant.data?.name ?? 'Add a photo'}</Text>
        <Text tone="muted">Photos of the menu help people check ingredients before they go. A moderator reviews each upload.</Text>
      </View>

      {image ? (
        <View style={{ gap: space.sm }}>
          <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" accessibilityLabel="Selected photo" />
          <Button label="Choose a different photo" variant="secondary" size="sm" onPress={() => setImage(null)} />
        </View>
      ) : (
        <View style={[styles.dropzone, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Icon name="image-outline" size={36} color={colors.primary} />
          <View style={styles.row}>
            <Button label="Take photo" icon="camera" onPress={() => pick('camera')} size="sm" />
            <Button label="Choose from library" icon="images-outline" variant="secondary" onPress={() => pick('library')} size="sm" />
          </View>
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Text variant="smallStrong">What’s in the photo?</Text>
        <View style={styles.row}>
          {(Object.keys(PHOTO_KIND_LABELS) as PhotoKind[]).map((k) => (
            <Chip key={k} label={PHOTO_KIND_LABELS[k]} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
      </View>
      <TextField
        label="Caption (optional)"
        placeholder={kind === 'dish' ? 'Which dish is this?' : 'Anything people should know'}
        value={caption}
        onChangeText={(t) => setCaption(t.slice(0, 300))}
      />
      {error && <ErrorBanner message={error} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg },
  dropzone: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
