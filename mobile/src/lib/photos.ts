import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';

import { PHOTO_BUCKET, supabase } from './supabase';

export interface PickedPhoto {
  uri: string;
  base64: string;
}

export type PickResult = { photo: PickedPhoto } | { error: string } | { cancelled: true };

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  base64: true,
  allowsEditing: false,
  exif: false,
};

function toResult(res: ImagePicker.ImagePickerResult): PickResult {
  if (res.canceled || !res.assets?.length) return { cancelled: true };
  const a = res.assets[0];
  if (!a.base64) return { error: 'Non riesco a leggere la foto. Riprova.' };
  return { photo: { uri: a.uri, base64: a.base64 } };
}

export async function pickFromLibrary(): Promise<PickResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') {
      return { error: 'Per scegliere una foto consenti a Boxly di accedere alla libreria nelle Impostazioni.' };
    }
    return toResult(await ImagePicker.launchImageLibraryAsync(pickerOptions));
  } catch {
    return { error: 'Non riesco ad aprire la libreria. Riprova.' };
  }
}

export async function takePhoto(): Promise<PickResult> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return { error: 'Per scattare una foto consenti a Boxly di usare la fotocamera nelle Impostazioni.' };
    }
    return toResult(await ImagePicker.launchCameraAsync(pickerOptions));
  } catch {
    return { error: 'La fotocamera non è disponibile su questo dispositivo. Scegli una foto dalla libreria.' };
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;

/** Decodifica base64 → ArrayBuffer (senza dipendenze esterne). */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const outLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(outLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = i + 2 < len ? lookup[clean.charCodeAt(i + 2)] : 0;
    const d = i + 3 < len ? lookup[clean.charCodeAt(i + 3)] : 0;
    if (p < outLen) bytes[p++] = (a << 2) | (b >> 4);
    if (p < outLen) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < outLen) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes.buffer;
}

/** Carica la foto in `item-photos/<itemId>/<timestamp>.jpg` e restituisce il path. */
export async function uploadItemPhoto(itemId: string, photo: PickedPhoto): Promise<string> {
  const path = `${itemId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, base64ToArrayBuffer(photo.base64), { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function removePhotos(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (!list.length) return;
  await supabase.storage.from(PHOTO_BUCKET).remove(list);
}

const cache = new Map<string, { url: string; exp: number }>();
const TTL = 60 * 60; // 60 minuti (CONTRACT §3)

/** Signed URL per più foto in una sola chiamata, con cache in memoria. */
export async function signedUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of paths) {
    if (!p) continue;
    const c = cache.get(p);
    if (c && c.exp > now) out[p] = c.url;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(missing, TTL);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) {
        out[row.path] = row.signedUrl;
        cache.set(row.path, { url: row.signedUrl, exp: now + (TTL - 60) * 1000 });
      }
    }
  }
  return out;
}

export function useSignedUrl(path: string | null | undefined): string | null {
  const [state, setState] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path) return;
    let active = true;
    signedUrls([path]).then((m) => {
      if (active) setState({ path, url: m[path] ?? null });
    });
    return () => {
      active = false;
    };
  }, [path]);
  return path && state?.path === path ? state.url : null;
}
