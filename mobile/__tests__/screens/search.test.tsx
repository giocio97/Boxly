/** Ricerca v2 (CONTRACT v2.4/v2.5): route di stack con input e chip per tipo. */
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import SearchScreen from '@/app/search';
import * as api from '@/lib/api';
import { router } from 'expo-router';

import { maglione } from './mocks';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api');
jest.mock('@/lib/photos', () => ({ signedUrls: jest.fn().mockResolvedValue({}), useSignedUrl: () => null }));

const mockedApi = api as jest.Mocked<typeof api>;
const rosa = {
  ...maglione,
  id: '22222222-2222-2222-2222-000000000006',
  box_id: '11111111-1111-1111-1111-000000000003',
  name: 'Libro "Il nome della rosa"',
  item_type: 'books',
  attributes: { author: 'Umberto Eco' },
  size: null,
  season: null,
  box_name: 'Libri',
  box_location: 'Garage',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.searchItems.mockResolvedValue({ data: [], error: null } as never);
});

describe('schermata ricerca', () => {
  it('input e chip: tutti + 8 tipi', () => {
    render(<SearchScreen />);
    expect(screen.getByTestId('search-input')).toBeTruthy();
    expect(screen.getByTestId('search-type-all')).toBeTruthy();
    for (const t of ['clothing', 'shoes_accessories', 'books', 'electronics', 'home_kitchen', 'toys_games', 'documents', 'other']) {
      expect(screen.getByTestId(`search-type-${t}`)).toBeTruthy();
    }
  });

  it('senza query né tipo non chiama la RPC e non mostra "nessun risultato"', async () => {
    render(<SearchScreen />);
    await new Promise((r) => setTimeout(r, 400));
    expect(mockedApi.searchItems).not.toHaveBeenCalled();
    expect(screen.queryByTestId('search-empty')).toBeNull();
  });

  it('ricerca per autore → risultato cliccabile che apre l’oggetto', async () => {
    mockedApi.searchItems.mockResolvedValue({ data: [rosa], error: null } as never);
    render(<SearchScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('search-input'), 'eco');
    const row = await screen.findByTestId(`search-result-${rosa.id}`);
    expect(mockedApi.searchItems).toHaveBeenLastCalledWith('eco', null);
    expect(screen.getByText(/Garage/)).toBeTruthy();
    await user.press(row);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/item/[id]', params: { id: rosa.id } });
  });

  it('solo chip tipo (query vuota) → search_items("", tipo)', async () => {
    render(<SearchScreen />);
    await userEvent.setup().press(screen.getByTestId('search-type-books'));
    await waitFor(() => expect(mockedApi.searchItems).toHaveBeenCalledWith('', 'books'));
    expect(await screen.findByTestId('search-empty')).toBeTruthy();
  });

  it('query + tipo, poi "tutti" toglie il filtro', async () => {
    render(<SearchScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('search-type-clothing'));
    await user.type(screen.getByTestId('search-input'), 'maglione');
    await waitFor(() => expect(mockedApi.searchItems).toHaveBeenLastCalledWith('maglione', 'clothing'));
    await user.press(screen.getByTestId('search-type-all'));
    await waitFor(() => expect(mockedApi.searchItems).toHaveBeenLastCalledWith('maglione', null));
  });

  it('nessun risultato → search-empty', async () => {
    render(<SearchScreen />);
    await userEvent.setup().type(screen.getByTestId('search-input'), 'zzz');
    expect(await screen.findByTestId('search-empty')).toBeTruthy();
  });

  it('errore invalid_type → messaggio tradotto, non il codice', async () => {
    mockedApi.searchItems.mockResolvedValue({ data: null, error: { message: 'invalid_type' } } as never);
    render(<SearchScreen />);
    await userEvent.setup().press(screen.getByTestId('search-type-books'));
    await waitFor(() => expect(mockedApi.searchItems).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('invalid_type')).toBeNull());
  });
});
