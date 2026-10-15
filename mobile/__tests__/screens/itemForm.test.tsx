/** Validazione form oggetto + gestione errori del picker foto. */
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { ItemForm } from '@/components/ItemForm';
import { pickFromLibrary } from '@/lib/photos';

jest.mock('@/lib/photos', () => ({ pickFromLibrary: jest.fn(), takePhoto: jest.fn() }));
const mockedPick = pickFromLibrary as jest.Mock;

beforeEach(() => jest.clearAllMocks());

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

  it('foto dalla libreria → anteprima e passata a onSubmit, campi trimmati', async () => {
    mockedPick.mockResolvedValue({ photo: { uri: 'file:///a.jpg', base64: 'AAAA' } });
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<ItemForm submitLabel="Aggiungi" onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('item-photo-library'));
    expect(await screen.findByTestId('item-photo-preview')).toBeTruthy();
    await user.type(screen.getByTestId('item-name-input'), ' Maglione blu ');
    await user.type(screen.getByTestId('item-brand-input'), 'Uniqlo');
    await user.press(screen.getByTestId('item-season-winter'));
    await user.press(screen.getByTestId('item-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        { name: 'Maglione blu', brand: 'Uniqlo', color: null, category: null, size: null, season: 'winter', notes: null },
        { uri: 'file:///a.jpg', base64: 'AAAA' },
      ),
    );
  });

  it('permesso libreria negato → messaggio, nessuna anteprima', async () => {
    mockedPick.mockResolvedValue({ error: 'Per scegliere una foto consenti a Boxly di accedere alla libreria nelle Impostazioni.' });
    render(<ItemForm submitLabel="Aggiungi" onSubmit={jest.fn()} />);
    await userEvent.setup().press(screen.getByTestId('item-photo-library'));
    expect(await screen.findByText(/consenti a Boxly/)).toBeTruthy();
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
