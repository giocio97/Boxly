/* Mock globali per i test (owner config: frontend). */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// i18n (CONTRACT v2.3): i test girano in italiano, indipendentemente dalla lingua della macchina.
// Le risorse sono inline, quindi changeLanguage è sincrono.
require('./src/i18n').default.changeLanguage('it');
