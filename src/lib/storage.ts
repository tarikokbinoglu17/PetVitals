import type { SupabaseClient } from '@supabase/supabase-js';
import type { LocalImage } from '../types';
import type { Database } from '../types/database';

const PET_PHOTOS_BUCKET = 'pet-photos';
const PET_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

function normalizeImageMimeType(value?: string | null) {
  const mimeType = value?.toLowerCase();
  if (mimeType === 'image/jpg') return 'image/jpeg';
  if (mimeType && ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType)) {
    return mimeType;
  }
  return 'image/jpeg';
}

function getImageExtension(file: LocalImage, mimeType: string) {
  const fileNameExtension = file.fileName?.split('.').pop()?.toLowerCase();
  if (fileNameExtension && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(fileNameExtension)) {
    return fileNameExtension === 'jpg' ? 'jpeg' : fileNameExtension;
  }

  const extensionByMimeType: Record<string, string> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return extensionByMimeType[mimeType] ?? 'jpeg';
}

export function createPetPhotoUploadTarget(
  userId: string,
  file: LocalImage,
  now = Date.now(),
  uniquePart = Math.random().toString(36).slice(2, 10),
) {
  const mimeType = normalizeImageMimeType(file.mimeType);
  const extension = getImageExtension(file, mimeType);
  return {
    mimeType,
    path: `${userId}/pets/${now}-${uniquePart}.${extension}`,
  };
}

export async function uploadPetPhoto(
  client: SupabaseClient<Database>,
  userId: string,
  file: LocalImage,
) {
  if (file.fileSize && file.fileSize > PET_PHOTO_MAX_BYTES) {
    throw new Error('PHOTO_TOO_LARGE');
  }

  let body: ArrayBuffer;
  try {
    const response = await fetch(file.uri);
    body = await response.arrayBuffer();
  } catch {
    throw new Error('PHOTO_READ_FAILED');
  }
  if (body.byteLength > PET_PHOTO_MAX_BYTES) throw new Error('PHOTO_TOO_LARGE');

  const { mimeType, path } = createPetPhotoUploadTarget(userId, file);
  const { data, error } = await client.storage
    .from(PET_PHOTOS_BUCKET)
    .upload(path, body, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;
  return data.path;
}

export async function getPetPhotoUrl(
  client: SupabaseClient<Database>,
  path?: string | null,
) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;

  const { data, error } = await client.storage
    .from(PET_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_LIFETIME_SECONDS);

  if (error) return undefined;
  return data.signedUrl;
}

export async function removePetPhoto(
  client: SupabaseClient<Database>,
  path?: string | null,
) {
  if (!path || /^https?:\/\//i.test(path)) return;
  await client.storage.from(PET_PHOTOS_BUCKET).remove([path]);
}
