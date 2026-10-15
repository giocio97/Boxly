/** Dettaglio oggetto: azioni per ruolo, destinazioni di spostamento, errore forbidden. */
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import ItemScreen from '@/app/item/[id]';
import * as api from '@/lib/api';

import { box, maglione } from './mocks';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => ({ id: '22222222-2222-2222-2222-000000000001' }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    Stack: { Screen: () => null },
  };
});
jest.mock('@/lib/api');
jest.mock('@/lib/photos', () => ({
  useSignedUrl: () => null,
  removePhotos: jest.fn().mockResolvedValue(undefined),
  uploadItemPhoto: jest.fn(),
  pickFromLibrary: jest.fn(),
  takePhoto: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const ESTATE = '11111111-1111-1111-1111-000000000002';
const LIBRI = '11111111-1111-1111-1111-000000000003';

function setup(role: 'owner' | 'editor' | 'viewer') {
  mockedApi.getItem.mockResolvedValue({ data: maglione as never, error: null });
  mockedApi.getBox.mockResolvedValue({ data: box(role), error: null });
  render(<ItemScreen />);
  return screen.findByTestId('item-title');
}

beforeEach(() => jest.clearAllMocks());

describe('dettaglio oggetto', () => {
  it.each(['owner', 'editor'] as const)('%s vede modifica/sposta/elimina', async (role) => {
    await setup(role);
    expect(screen.getByTestId('item-edit-button')).toBeTruthy();
    expect(screen.getByTestId('item-move-button')).toBeTruthy();
    expect(screen.getByTestId('item-delete-button')).toBeTruthy();
  });

  it('viewer: nessuna azione di modifica renderizzata', async () => {
    await setup('viewer');
    expect(screen.getByTestId('item-title')).toHaveTextContent('Maglione blu');
    expect(screen.queryByTestId('item-edit-button')).toBeNull();
    expect(screen.queryByTestId('item-move-button')).toBeNull();
    expect(screen.queryByTestId('item-delete-button')).toBeNull();
  });

  it('sposta: solo scatole modificabili diverse da quella attuale; forbidden tradotto', async () => {
    await setup('owner');
    mockedApi.listBoxes.mockResolvedValue({
      data: [box('owner'), box('owner', { id: ESTATE, name: 'Estate' }), box('viewer', { id: LIBRI, name: 'Libri' })],
      error: null,
    });
    mockedApi.moveItem.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    const user = userEvent.setup();
    await user.press(screen.getByTestId('item-move-button'));
    expect(await screen.findByTestId(`move-target-${ESTATE}`)).toBeTruthy();
    expect(screen.queryByTestId(`move-target-${LIBRI}`)).toBeNull();
    expect(screen.queryByTestId(`move-target-${maglione.box_id}`)).toBeNull();
    await user.press(screen.getByTestId(`move-target-${ESTATE}`));
    await waitFor(() => expect(mockedApi.moveItem).toHaveBeenCalledWith(maglione.id, ESTATE));
    expect(await screen.findByText('Non hai i permessi per modificare una delle due scatole.')).toBeTruthy();
  });

  it('oggetto non visibile → "Oggetto non trovato"', async () => {
    mockedApi.getItem.mockResolvedValue({ data: null, error: null });
    render(<ItemScreen />);
    expect(await screen.findByText('Oggetto non trovato')).toBeTruthy();
  });
});
