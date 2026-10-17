/** ItemForm v2: validazione, foto, tipi di oggetto con campi dinamici e payload pulito (CONTRACT v2.2). */
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { ItemForm } from '@/components/ItemForm';
import { pickFromLibrary } from '@/lib/photos';

jest.mock('@/lib/photos', () => ({ pickFromLibrary: jest.fn(), takePhoto: jest.fn() }));
const mockedPick = pickFromLibrary as jest.Mock;

const TYPES = ['clothing', 'shoes_accessories', 'books', 'electronics', 'home_kitchen', 'toys_games', 'documents', 'other'] as const;

beforeEach(() => jest.clearAllMocks());

function visible(id: string) {
  return screen.queryByTestId(id) !== null;
}

describe('ItemForm', () => {
  it('nome obbligatorio', async () => {
    const onSubmit = jest.fn();
    render(<ItemForm submitLabel="Aggiungi" onSubmit={onSubmit} />);
    await userEvent.setup().press(screen.getByTestId('item-save'));
    expect(screen.getByTestId('form-error')).toHaveTextContent('Dai un nome all’oggetto.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('nome max 120 caratteri', () => {
    render(<ItemForm submitLabel="Aggiungi" onSubmit={jest.fn()} />);
    expect(screen.getByTestId('item-name-input').props.maxLength).toBe(120);
  });

  it('foto dalla libreria → anteprima e passata a onSubmit, campi trimmati (tipo clothing)', async () => {
    mockedPick.mockResolvedValue({ photo: { uri: 'file:///a.jpg', base64: 'AAAA' } });
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Aggiungi" onSubmit={onSubmit} initial={{ item_type: 'clothing' }} />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('item-photo-library'));
    expect(await screen.findByTestId('item-photo-preview')).toBeTruthy();
    await user.type(screen.getByTestId('item-name-input'), ' Maglione blu ');
    await user.type(screen.getByTestId('item-brand-input'), 'Uniqlo');
    await user.press(screen.getByTestId('item-season-winter'));
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Maglione blu',
          item_type: 'clothing',
          attributes: {},
          brand: 'Uniqlo',
          color: null,
          category: null,
          size: null,
          season: 'winter',
          notes: null,
        },
        { uri: 'file:///a.jpg', base64: 'AAAA' },
      ),
    );
  });

  it('permesso libreria negato → messaggio, nessuna anteprima', async () => {
    mockedPick.mockResolvedValue({ error: 'Per scegliere una foto consenti a Stivo di accedere alla libreria nelle Impostazioni.' });
    render(<ItemForm submitLabel="Aggiungi" onSubmit={jest.fn()} />);
    await userEvent.setup().press(screen.getByTestId('item-photo-library'));
    expect(await screen.findByText(/consenti a Stivo/)).toBeTruthy();
    expect(screen.queryByTestId('item-photo-preview')).toBeNull();
  });

  it('annullare il picker non mostra errori', async () => {
    mockedPick.mockResolvedValue({ cancelled: true });
    render(<ItemForm submitLabel="Aggiungi" onSubmit={jest.fn()} />);
    await userEvent.setup().press(screen.getByTestId('item-photo-library'));
    await waitFor(() => expect(mockedPick).toHaveBeenCalled());
    expect(screen.queryByTestId('item-photo-preview')).toBeNull();
  });
});

describe('ItemForm: tipi di oggetto', () => {
  it('mostra un chip per ciascuno degli 8 tipi', () => {
    render(<ItemForm submitLabel="Aggiungi" onSubmit={jest.fn()} />);
    for (const t of TYPES) expect(screen.getByTestId(`item-type-${t}`)).toBeTruthy();
  });

  it('senza initial.item_type il tipo è other', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Aggiungi" onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('item-name-input'), 'Cosa');
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ item_type: 'other', attributes: {}, size: null, season: null });
  });

  it.each([
    ['clothing', ['item-size-input', 'item-season-winter']],
    ['shoes_accessories', ['item-size-input', 'item-season-winter']],
    ['books', ['item-author-input']],
    ['electronics', ['item-model-input', 'item-serial-input']],
    ['home_kitchen', []],
    ['toys_games', []],
    ['documents', []],
    ['other', []],
  ] as const)('tipo %s → campi specifici %j', (type, expected) => {
    render(<ItemForm submitLabel="Aggiungi" onSubmit={jest.fn()} initial={{ item_type: type }} />);
    const all = ['item-size-input', 'item-season-winter', 'item-author-input', 'item-model-input', 'item-serial-input'];
    for (const id of all) expect([id, visible(id)]).toEqual([id, (expected as readonly string[]).includes(id)]);
    // i campi comuni ci sono sempre
    for (const id of ['item-name-input', 'item-brand-input', 'item-color-input', 'item-category-input', 'item-notes-input']) {
      expect(visible(id)).toBe(true);
    }
  });

  it('cambiare tipo dal chip mostra/nasconde i campi', async () => {
    render(<ItemForm submitLabel="Aggiungi" onSubmit={jest.fn()} initial={{ item_type: 'other' }} />);
    const user = userEvent.setup();
    expect(visible('item-author-input')).toBe(false);
    await user.press(screen.getByTestId('item-type-books'));
    expect(visible('item-author-input')).toBe(true);
    expect(visible('item-size-input')).toBe(false);
    await user.press(screen.getByTestId('item-type-electronics'));
    expect(visible('item-author-input')).toBe(false);
    expect(visible('item-model-input')).toBe(true);
    expect(visible('item-serial-input')).toBe(true);
    await user.press(screen.getByTestId('item-type-clothing'));
    expect(visible('item-size-input')).toBe(true);
    expect(visible('item-model-input')).toBe(false);
  });

  it('libro con autore → attributes.author, size/season null', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Aggiungi" onSubmit={onSubmit} initial={{ item_type: 'books' }} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('item-name-input'), 'Il pendolo di Foucault');
    await user.type(screen.getByTestId('item-author-input'), ' Umberto Eco ');
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Il pendolo di Foucault',
      item_type: 'books',
      attributes: { author: 'Umberto Eco' },
      brand: null,
      color: null,
      category: null,
      size: null,
      season: null,
      notes: null,
    });
  });

  it('elettronica: modello e seriale; seriale vuoto rimosso', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Aggiungi" onSubmit={onSubmit} initial={{ item_type: 'electronics' }} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('item-name-input'), 'Kindle');
    await user.type(screen.getByTestId('item-model-input'), 'Paperwhite 11');
    await user.type(screen.getByTestId('item-serial-input'), '   ');
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ item_type: 'electronics', attributes: { model: 'Paperwhite 11' }, size: null, season: null });
    expect(onSubmit.mock.calls[0][0].attributes).not.toHaveProperty('serial');
  });

  it('clothing → books: taglia e stagione già compilate diventano null, autore salvato', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Salva" onSubmit={onSubmit} initial={{ name: 'Oggetto', item_type: 'clothing', size: 'M', season: 'winter' }} />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('item-type-books'));
    await user.type(screen.getByTestId('item-author-input'), 'Eco');
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ item_type: 'books', size: null, season: null, attributes: { author: 'Eco' } });
  });

  it('books → other: attributes iniziali non previsti vengono rimossi', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(
      <ItemForm
        submitLabel="Salva"
        onSubmit={onSubmit}
        initial={{ name: 'Libro', item_type: 'books', attributes: { author: 'Eco', model: 'X', serial: 'Y' } }}
      />,
    );
    const user = userEvent.setup();
    await user.press(screen.getByTestId('item-type-other'));
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ item_type: 'other', attributes: {} });
  });

  it('modifica: un libro esistente mostra l’autore precompilato e lo mantiene', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Salva" onSubmit={onSubmit} initial={{ name: 'Il nome della rosa', item_type: 'books', attributes: { author: 'Umberto Eco' } }} />);
    expect(screen.getByTestId('item-author-input').props.value).toBe('Umberto Eco');
    await userEvent.setup().press(screen.getByTestId('item-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ item_type: 'books', attributes: { author: 'Umberto Eco' } });
  });

  it('il payload non contiene chiavi estranee', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Aggiungi" onSubmit={onSubmit} initial={{ item_type: 'electronics' }} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('item-name-input'), 'X');
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(Object.keys(onSubmit.mock.calls[0][0]).sort()).toEqual(
      ['attributes', 'brand', 'category', 'color', 'item_type', 'name', 'notes', 'season', 'size'].sort(),
    );
  });
});
