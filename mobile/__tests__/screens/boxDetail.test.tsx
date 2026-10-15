/** Rendering condizionale per ruolo nel dettaglio scatola (CONTRACT §6: per i viewer i pulsanti non sono renderizzati). */
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import BoxDetailScreen from '@/app/box/[id]/index';
import * as api from '@/lib/api';
import { router } from 'expo-router';

import { box, INVERNO, maglione } from './mocks';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => ({ id: '11111111-1111-1111-1111-000000000001' }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    Stack: { Screen: () => null },
  };
});
jest.mock('@/lib/api');
jest.mock('@/lib/photos', () => ({
  signedUrls: jest.fn().mockResolvedValue({}),
  removePhotos: jest.fn().mockResolvedValue(undefined),
  useSignedUrl: () => null,
}));

const mockedApi = api as jest.Mocked<typeof api>;

function setup(role: 'owner' | 'editor' | 'viewer', items: unknown[] = [maglione]) {
  mockedApi.getBox.mockResolvedValue({ data: box(role), error: null });
  mockedApi.listItems.mockResolvedValue({ data: items as never, error: null });
  render(<BoxDetailScreen />);
  return screen.findByTestId('box-title');
}

beforeEach(() => jest.clearAllMocks());

describe('dettaglio scatola per ruolo', () => {
  it('owner: tutte le azioni', async () => {
    await setup('owner');
    for (const id of ['add-item-button', 'edit-box-button', 'delete-box-button', 'show-qr-button', 'share-button', 'history-button']) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    expect(screen.getByTestId('role-badge')).toHaveTextContent('Proprietario');
    expect(screen.queryByText(/Condivisa da/)).toBeNull();
  });

  it('editor: aggiunge e modifica, ma non elimina la scatola', async () => {
    await setup('editor');
    expect(screen.getByTestId('add-item-button')).toBeTruthy();
    expect(screen.getByTestId('edit-box-button')).toBeTruthy();
    expect(screen.queryByTestId('delete-box-button')).toBeNull();
    expect(screen.getByText('Condivisa da alice@boxly.test')).toBeTruthy();
  });

  it('viewer: nessun pulsante di modifica renderizzato', async () => {
    await setup('viewer');
    expect(screen.queryByTestId('add-item-button')).toBeNull();
    expect(screen.queryByTestId('edit-box-button')).toBeNull();
    expect(screen.queryByTestId('delete-box-button')).toBeNull();
    expect(screen.getByTestId('show-qr-button')).toBeTruthy();
    expect(screen.getByTestId('history-button')).toBeTruthy();
    expect(screen.getByTestId('role-badge')).toHaveTextContent('Solo lettura');
    expect(screen.getByTestId(`item-row-${maglione.id}`)).toBeTruthy();
  });

  it('lista vuota → empty-items, con messaggio diverso per viewer', async () => {
    await setup('viewer', []);
    expect(screen.getByTestId('empty-items')).toBeTruthy();
    expect(screen.queryByText('Aggiungi il primo oggetto con una foto.')).toBeNull();
  });

  it('scatola non accessibile (RLS → null) → box-not-found', async () => {
    mockedApi.getBox.mockResolvedValue({ data: null, error: null });
    mockedApi.listItems.mockResolvedValue({ data: [], error: null });
    render(<BoxDetailScreen />);
    expect(await screen.findByTestId('box-not-found')).toBeTruthy();
    expect(screen.queryByTestId('add-item-button')).toBeNull();
  });

  it('owner: elimina con conferma', async () => {
    mockedApi.deleteBox.mockResolvedValue({ data: null, error: null });
    await setup('owner');
    const user = userEvent.setup();
    await user.press(screen.getByTestId('delete-box-button'));
    await user.press(await screen.findByTestId('confirm-yes'));
    await waitFor(() => expect(mockedApi.deleteBox).toHaveBeenCalledWith(INVERNO));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('owner: annulla eliminazione', async () => {
    await setup('owner');
    const user = userEvent.setup();
    await user.press(screen.getByTestId('delete-box-button'));
    await user.press(await screen.findByTestId('confirm-no'));
    expect(mockedApi.deleteBox).not.toHaveBeenCalled();
  });

  it('add-item-button apre item/new con boxId', async () => {
    await setup('editor');
    await userEvent.setup().press(screen.getByTestId('add-item-button'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/item/new', params: { boxId: INVERNO } });
  });
});
