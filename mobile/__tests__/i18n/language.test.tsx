/** Cambio lingua (CONTRACT v2.3): immediato, salvato in AsyncStorage `stivo.lang`, {{app}} = Stivo. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import i18n, { LANG_KEY, loadSavedLanguage, setLanguage } from '@/i18n';
import en from '@/i18n/locales/en.json';
import itJson from '@/i18n/locales/it.json';
import { APP_NAME } from '@/lib/brand';

function Probe() {
  const { t } = useTranslation();
  return <Text testID="probe">{t('auth.login.submit')}</Text>;
}

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('it');
  });
  await AsyncStorage.clear();
});

describe('i18n', () => {
  it('nei test la lingua iniziale è italiano', () => {
    expect(i18n.language).toBe('it');
    expect(i18n.t('auth.login.submit')).toBe(itJson.auth.login.submit);
  });

  it('LANG_KEY è stivo.lang', () => {
    expect(LANG_KEY).toBe('stivo.lang');
  });

  it('it → en cambia subito un testo renderizzato, poi torna in italiano', async () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent(itJson.auth.login.submit);
    await act(async () => {
      await setLanguage('en');
    });
    expect(screen.getByTestId('probe')).toHaveTextContent(en.auth.login.submit);
    expect(en.auth.login.submit).not.toBe(itJson.auth.login.submit);
    await act(async () => {
      await setLanguage('it');
    });
    expect(screen.getByTestId('probe')).toHaveTextContent(itJson.auth.login.submit);
  });

  it('setLanguage salva la scelta in AsyncStorage', async () => {
    await act(async () => {
      await setLanguage('en');
    });
    expect(await AsyncStorage.getItem('stivo.lang')).toBe('en');
  });

  it('loadSavedLanguage applica la lingua salvata', async () => {
    await AsyncStorage.setItem('stivo.lang', 'en');
    await act(async () => {
      await loadSavedLanguage();
    });
    expect(i18n.language).toBe('en');
  });

  it('loadSavedLanguage ignora valori non validi', async () => {
    await AsyncStorage.setItem('stivo.lang', 'fr');
    await act(async () => {
      await loadSavedLanguage();
    });
    expect(i18n.language).toBe('it');
  });

  it('{{app}} è interpolato con APP_NAME in entrambe le lingue', async () => {
    expect(i18n.t('errors.rpc.user_not_found')).toContain(APP_NAME);
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(i18n.t('errors.rpc.user_not_found')).toContain(APP_NAME);
    expect(i18n.t('errors.rpc.user_not_found')).not.toContain('{{');
  });

  it('chiave mancante in it → fallback en (non la chiave grezza)', () => {
    i18n.addResource('en', 'translation', 'qa.onlyEn', 'Only in English');
    expect(i18n.t('qa.onlyEn')).toBe('Only in English');
  });
});

describe('lingua del dispositivo', () => {
  afterEach(() => jest.resetModules());

  it.each([
    ['it', 'it'],
    ['en', 'en'],
    ['fr', 'en'],
    ['de', 'en'],
  ])('dispositivo %s → %s', (code, expected) => {
    jest.isolateModules(() => {
      jest.doMock('expo-localization', () => ({ getLocales: () => [{ languageCode: code }] }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/i18n');
      expect(mod.deviceLang()).toBe(expected);
    });
  });
});
