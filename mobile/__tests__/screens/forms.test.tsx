/** Validazione dei form: login e scatola. */
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/login';
import { BoxForm } from '@/components/BoxForm';

const mockSignIn = jest.fn();
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ signIn: mockSignIn }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

describe('login', () => {
  it('campi vuoti → errore, signIn non chiamato', async () => {
    render(<LoginScreen />);
    await userEvent.setup().press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('auth-error')).toHaveTextContent('Inserisci email e password.');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('credenziali errate → auth-error tradotto', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('Invalid login credentials') });
    render(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('login-email'), 'alice@boxly.test');
    await user.type(screen.getByTestId('login-password'), 'sbagliata');
    await user.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-error')).toHaveTextContent('Email o password non corretti.'));
    expect(mockSignIn).toHaveBeenCalledWith('alice@boxly.test', 'sbagliata');
  });

  it('login ok → nessun errore', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('login-email'), 'alice@boxly.test');
    await user.type(screen.getByTestId('login-password'), 'password123');
    await user.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(screen.queryByText(/non corretti/)).toBeNull();
  });
});

describe('BoxForm', () => {
  it('nome vuoto o solo spazi → errore', async () => {
    const onSubmit = jest.fn();
    render(<BoxForm submitLabel="Crea scatola" onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('box-name-input'), '   ');
    await user.press(screen.getByTestId('box-save'));
    expect(screen.getByText('Dai un nome alla scatola.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('input limitato a 80 caratteri', () => {
    render(<BoxForm submitLabel="Crea" onSubmit={jest.fn()} />);
    expect(screen.getByTestId('box-name-input').props.maxLength).toBe(80);
  });

  it('valori trimmati, vuoti → null, stagione selezionata', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    render(<BoxForm submitLabel="Crea" onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('box-name-input'), '  Trasloco  ');
    await user.press(screen.getByTestId('box-season-winter'));
    await user.press(screen.getByTestId('box-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Trasloco', location: null, season: 'winter', notes: null }),
    );
  });

  it('errore restituito da onSubmit mostrato', async () => {
    const onSubmit = jest.fn().mockResolvedValue('Non riesco a creare la scatola. Riprova.');
    render(<BoxForm submitLabel="Crea" onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId('box-name-input'), 'X');
    await user.press(screen.getByTestId('box-save'));
    expect(await screen.findByText('Non riesco a creare la scatola. Riprova.')).toBeTruthy();
  });

  it('modifica: valori iniziali precompilati', () => {
    render(<BoxForm submitLabel="Salva" initial={{ name: 'Estate', location: 'Armadio', season: 'summer' }} onSubmit={jest.fn()} />);
    expect(screen.getByTestId('box-name-input').props.value).toBe('Estate');
    expect(screen.getByTestId('box-season-summer').props.accessibilityState.selected).toBe(true);
  });
});
