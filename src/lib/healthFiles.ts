import { supabase } from './supabase';

const HEALTH_DOCUMENTS_BUCKET = 'health-documents';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function extensionForAudio(uri: string, mimeType?: string) {
  const uriExtension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (uriExtension && ['m4a', 'mp3', 'mp4', 'wav', 'webm', 'mpeg', 'mpga'].includes(uriExtension)) return uriExtension;
  if (mimeType?.includes('webm')) return 'webm';
  if (mimeType?.includes('wav')) return 'wav';
  if (mimeType?.includes('mpeg')) return 'mp3';
  return 'm4a';
}

export async function uploadVetVisitAudio(userId: string, uri: string, mimeType = 'audio/m4a') {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  let body: ArrayBuffer;
  try {
    const response = await fetch(uri);
    body = await response.arrayBuffer();
  } catch {
    throw new Error('Ses kaydı okunamadı.');
  }
  if (body.byteLength > MAX_AUDIO_BYTES) throw new Error('Ses kaydı 25 MB sınırını aşıyor. Kaydı kısaltın.');
  const extension = extensionForAudio(uri, mimeType);
  const path = `${userId}/vet-visits/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { data, error } = await supabase.storage.from(HEALTH_DOCUMENTS_BUCKET).upload(path, body, {
    cacheControl: '0', contentType: mimeType, upsert: false,
  });
  if (error) throw error;
  return data.path;
}

export async function deleteHealthDocument(path?: string) {
  if (!path || !supabase) return;
  await supabase.storage.from(HEALTH_DOCUMENTS_BUCKET).remove([path]);
}
