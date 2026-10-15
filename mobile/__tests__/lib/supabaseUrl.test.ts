import { resolveSupabaseUrl } from '@/lib/supabase';

describe('resolveSupabaseUrl (CONTRACT §1)', () => {
  it('Android: 127.0.0.1 e localhost → 10.0.2.2', () => {
    expect(resolveSupabaseUrl('http://127.0.0.1:54321', 'android')).toBe('http://10.0.2.2:54321');
    expect(resolveSupabaseUrl('http://localhost:54321', 'android')).toBe('http://10.0.2.2:54321');
  });
  it('iOS e web invariati', () => {
    expect(resolveSupabaseUrl('http://127.0.0.1:54321', 'ios')).toBe('http://127.0.0.1:54321');
    expect(resolveSupabaseUrl('http://127.0.0.1:54321', 'web')).toBe('http://127.0.0.1:54321');
  });
  it('Android con host remoto invariato', () => {
    expect(resolveSupabaseUrl('https://abc.supabase.co', 'android')).toBe('https://abc.supabase.co');
  });
});
