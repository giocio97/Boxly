/** Schermata condivisioni: solo l'owner modifica; mapping errori RPC in share-error. */
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import ShareScreen from '@/app/box/[id]/share';
import * as api from '@/lib/api';

import { ALICE, BOB, box, CAROL, INVERNO } from './mocks';

let mockMe = '00000000-0000-0000-0000-00000000000a';
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
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ session: { user: { id: mockMe } } }) }));

const mockedApi = api as jest.Mocked<typeof api>;
const bobShare = { box_id: INVERNO, user_id: BOB, role: 'viewer' as const, created_at: '', email: 'bob@boxly.test', display_name: 'Bob' };
const carolShare = { ...bobShare, user_id: CAROL, email: 'carol@boxly.test', display_name: null };

function setup(role: 'owner' | 'editor' | 'viewer', me: string) {
  mockMe = me;
  mockedApi.getBox.mockResolvedValue({ data: box(role), error: null });
  mockedApi.listShareMembers.mockResolvedValue({ data: [bobShare, carolShare], error: null });
  render(<ShareScreen />);
  return screen.findByTestId(`share-row-${BOB}`);
}

beforeEach(() => jest.clearAllMocks());

describe('condivisione', () => {
  it('owner vede il form e può revocare tutti', async () => {
    await setup('owner', ALICE);
    expect(screen.getByTestId('share-email-input')).toBeTruthy();
    expect(screen.getByTestId('share-role-viewer')).toBeTruthy();
    expect(screen.getByTestId('share-role-editor')).toBeTruthy();
    expect(screen.getByTestId(`revoke-${BOB}`)).toBeTruthy();
    expect(screen.getByTestId(`revoke-${CAROL}`)).toBeTruthy();
  });

  it('viewer (bob) non vede il form e può solo uscire lui', async () => {
    await setup('viewer', BOB);
    expect(screen.queryByTestId('share-email-input')).toBeNull();
    expect(screen.queryByTestId('share-submit')).toBeNull();
    expect(screen.getByTestId(`revoke-${BOB}`)).toHaveTextContent('Esci');
    expect(screen.queryByTestId(`revoke-${CAROL}`)).toBeNull();
  });

  it('editor non vede il form di condivisione', async () => {
    await setup('editor', BOB);
    expect(screen.queryByTestId('share-email-input')).toBeNull();
  });

  it('email vuota → errore di validazione senza chiamare la RPC', async () => {
    await setup('owner', ALICE);
    await userEvent.setup().press(screen.getByTestId('share-submit'));
    expect(screen.getByTestId('share-error')).toHaveTextContent(/email/);
    expect(mockedApi.shareBox).not.toHaveBeenCalled();
  });

  it.each([
    ['user_not_found', /Nessun utente Stivo/],
    ['cannot_share_with_self', /già tua/],
    ['not_owner', /proprietario/],
  ])('errore RPC %s → messaggio in italiano', async (code, re) => {
    await setup('owner', ALICE);
    mockedApi.shareBox.mockResolvedValue({ data: null, error: { message: code } });
    const user = userEvent.setup();
    await user.type(screen.getByTestId('share-email-input'), 'x@boxly.test');
    await user.press(screen.getByTestId('share-submit'));
    await waitFor(() => expect(screen.getByTestId('share-error')).toHaveTextContent(re));
  });

  it('condivisione in sola lettura chiama share_box con il ruolo scelto', async () => {
    await setup('owner', ALICE);
    mockedApi.shareBox.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    await user.type(screen.getByTestId('share-email-input'), 'carol@boxly.test');
    await user.press(screen.getByTestId('share-role-editor'));
    await user.press(screen.getByTestId('share-role-viewer'));
    await user.press(screen.getByTestId('share-submit'));
    await waitFor(() => expect(mockedApi.shareBox).toHaveBeenCalledWith(INVERNO, 'carol@boxly.test', 'viewer'));
    expect(await screen.findByTestId('share-success')).toBeTruthy();
  });

  it('revoca con conferma', async () => {
    await setup('owner', ALICE);
    mockedApi.revokeShare.mockResolvedValue({ data: null, error: null });
    const user = userEvent.setup();
    await user.press(screen.getByTestId(`revoke-${CAROL}`));
    await user.press(await screen.findByTestId('confirm-yes'));
    await waitFor(() => expect(mockedApi.revokeShare).toHaveBeenCalledWith(INVERNO, CAROL));
  });
});
