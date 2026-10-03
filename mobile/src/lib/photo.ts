/**
 * Taking or picking a product photo, ready for a rural upload.
 *
 * A phone camera writes 4–12 MB; over village 3G that is a minute of waiting
 * and often a failed upload. Every photo is scaled to 1280 px on the long side
 * and saved as an ~80% JPEG — a few hundred KB, still sharp on any screen.
 * HEIC from iPhones becomes JPEG on the way, which every browser can show.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { LocalPhoto } from './api';

const MAX_SIDE = 1280;

export type PhotoResult =
  | { ok: true; photo: LocalPhoto }
  | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<LocalPhoto> {
  const landscape = (asset.width ?? 0) >= (asset.height ?? 0);
  const context = ImageManipulator.manipulate(asset.uri);
  const tooBig = Math.max(asset.width ?? 0, asset.height ?? 0) > MAX_SIDE;
  if (tooBig) context.resize(landscape ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: result.uri, name: `listing-${Date.now()}.jpg`, type: 'image/jpeg' };
}

export async function pickPhoto(source: 'camera' | 'library'): Promise<PhotoResult> {
  try {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.length) return { ok: false, reason: 'cancelled' };
    return { ok: true, photo: await shrink(result.assets[0]) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
