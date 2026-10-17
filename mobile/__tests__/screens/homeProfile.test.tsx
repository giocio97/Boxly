/** v2.4: schermata Scatole (barra di ricerca, pillola flottante anche a lista vuota) e Profilo (lingua). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import BoxesScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profile';
import i18n from '@/i18n';
import en from '@/i18n/locales/en.json';
import itJson from '@/i18n/locales/it.json';
import * as api from '@/lib/api';
import { router } from 'expo-router';

import { ALICE, box } from './mocks';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn() },
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});
jest.mock('@/lib/api');
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: { user: { id: '00000000-0000-0000-0000-00000000000a', email: 'alice@boxly.test' } }, signOut: jest.fn() }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('it');
  });
  await AsyncStorage.clear();
});

describe('schermata Scatole', () => {
  it('lista vuota: empty-boxes, new-box-button e home-search-bar visibili', async () => {
    mockedApi.listBoxes.mockResolvedValue({ data: [], error: null } as never);
    render(<BoxesScreen />);
    expect(await screen.findByTestId('empty-boxes')).toBeTruthy();
    expect(screen.getByTestId('new-box-button')).toBeTruthy();
    expect(screen.getByTestId('home-search-bar')).toBeTruthy();
  });

  it('con scatole: card, pillola e barra di ricerca', async () => {
    mockedApi.listBoxes.mockResolvedValue({ data: [box('owner')], error: null } as never);
    render(<BoxesScreen />);
    expect(await screen.findByTestId(`box-card-${box('owner').id}`)).toBeTruthy();
    expect(screen.getByTestId('new-box-button')).toBeTruthy();
    expect(screen.queryByTestId('empty-boxes')).toBeNull();
  });

  it('tap su home-search-bar apre /search', async () => {
    mockedApi.listBoxes.mockResolvedValue({ data: [], error: null } as never);
    render(<BoxesScreen />);
    await userEvent.setup().press(await screen.findByTestId('home-search-bar'));
    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('tap su new-box-button apre /box/new', async () => {
    mockedApi.listBoxes.mockResolvedValue({ data: [], error: null } as never);
    render(<BoxesScreen />);
    await userEvent.setup().press(await screen.findByTestId('new-box-button'));
    expect(router.push).toHaveBeenCalledWith('/box/new');
  });
});

describe('Profilo: lingua', () => {
  beforeEach(() => {
    mockedApi.getMyProfile.mockResolvedValue({ data: { id: ALICE, email: 'alice@boxly.test', display_name: 'Alice', created_at: '' }, error: null } as never);
  });

  it('chip lang-it e lang-en, Italiano selezionato', async () => {
    render(<ProfileScreen />);
    expect(await screen.findByTestId('lang-it')).toBeTruthy();
    expect(screen.getByTestId('lang-en')).toBeTruthy();
    expect(screen.getByTestId('lang-it').props.accessibilityState?.selected).toBe(true);
  });

  it('tap su English: il testo cambia subito e la scelta è salvata; poi torna in Italiano', async () => {
    render(<ProfileScreen />);
    const user = userEvent.setup();
    expect(await screen.findByText(itJson.profile.language)).toBeTruthy();
    await user.press(screen.getByTestId('lang-en'));
    expect(await screen.findByText(en.profile.language)).toBeTruthy();
    expect(screen.getByText(en.profile.logout)).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem('stivo.lang')).toBe('en'));
    await user.press(screen.getByTestId('lang-it'));
    expect(await screen.findByText(itJson.profile.language)).toBeTruthy();
    expect(screen.getByText(itJson.profile.logout)).toBeTruthy();
  });
});
