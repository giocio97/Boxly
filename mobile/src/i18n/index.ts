import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { APP_NAME } from '@/lib/brand';
import en from './locales/en.json';
import it from './locales/it.json';

export type Lang = 'it' | 'en';
export const LANGS: Lang[] = ['it', 'en'];
/** Chiave AsyncStorage della lingua scelta dall'utente (CONTRACT v2.3). */
export const LANG_KEY = 'stivo.lang';

function isLang(v: unknown): v is Lang {
  return v === 'it' || v === 'en';
}

/** Lingua del dispositivo se è italiano, altrimenti inglese. */
export function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'it' ? 'it' : 'en';
  } catch {
    return 'en';
  }
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources: { it: { translation: it }, en: { translation: en } },
  lng: deviceLang(),
  fallbackLng: 'en',
  supportedLngs: LANGS,
  interpolation: { escapeValue: false, defaultVariables: { app: APP_NAME } },
  returnNull: false,
});

/** Applica la lingua salvata (se c'è). Da chiamare una volta all'avvio, prima di mostrare l'app. */
export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (isLang(saved) && saved !== i18n.language) await i18n.changeLanguage(saved);
  } catch {
    // niente lingua salvata leggibile: resta quella del dispositivo
  }
}

/** Cambia lingua subito e la ricorda per i prossimi avvii. */
export async function setLanguage(lang: Lang): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {
    // la lingua resta attiva per questa sessione
  }
}

export function currentLang(): Lang {
  return isLang(i18n.language) ? i18n.language : 'en';
}

export default i18n;
