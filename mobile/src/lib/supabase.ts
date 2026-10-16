import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Device from 'expo-device';
import { AppState, Platform } from 'react-native';

/**
 * Su emulatore Android 127.0.0.1/localhost puntano all'emulatore: si usa 10.0.2.2 (CONTRACT §1).
 * Su un telefono fisico collegato via USB si usa `adb reverse tcp:54321 tcp:54321`, quindi 127.0.0.1 resta valido.
 */
export function resolveSupabaseUrl(
  url: string,
  os: string = Platform.OS,
  isPhysicalDevice: boolean = os === 'android' && Device.isDevice,
): string {
  if (os !== 'android' || isPhysicalDevice) return url;
  return url.replace('://127.0.0.1', '://10.0.2.2').replace('://localhost', '://10.0.2.2');
}

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const SUPABASE_URL = resolveSupabaseUrl(rawUrl);
export const PHOTO_BUCKET = 'item-photos';

export const supabase = createClient(SUPABASE_URL, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
