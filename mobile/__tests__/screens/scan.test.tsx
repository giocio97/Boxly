/** Scanner (v2): accetta stivo://box/<uuid> e il legacy boxly://box/<uuid>, altrimenti "Questo QR non è di Stivo". */
import { act, render, screen, userEvent } from '@testing-library/react-native';

import ScanScreen from '@/app/(tabs)/scan';
import { router } from 'expo-router';

const INVERNO = '11111111-1111-1111-1111-000000000001';
let mockOnScan: ((r: { data: string }) => void) | null = null;
let mockGranted = true;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useIsFocused: () => true,
}));
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: mockGranted }, jest.fn()],
  CameraView: (props: { onBarcodeScanned: (r: { data: string }) => void }) => {
    mockOnScan = props.onBarcodeScanned;
    return null;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
  mockOnScan = null;
});

describe('scanner QR', () => {
  it('QR Stivo → apre la scatola', () => {
    render(<ScanScreen />);
    act(() => mockOnScan!({ data: `stivo://box/${INVERNO}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/box/[id]', params: { id: INVERNO } });
  });

  it('QR legacy Boxly (etichetta vecchia) → apre la scatola', () => {
    render(<ScanScreen />);
    act(() => mockOnScan!({ data: `boxly://box/${INVERNO}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/box/[id]', params: { id: INVERNO } });
  });

  it('QR estraneo → errore, nessuna navigazione', () => {
    render(<ScanScreen />);
    act(() => mockOnScan!({ data: 'https://example.com' }));
    expect(screen.getByTestId('scan-error')).toHaveTextContent(/Questo QR non è di Stivo/);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('scansioni ripetute dello stesso QR valido non aprono più volte la scatola', () => {
    render(<ScanScreen />);
    act(() => {
      mockOnScan!({ data: `stivo://box/${INVERNO}` });
      mockOnScan!({ data: `stivo://box/${INVERNO}` });
      mockOnScan!({ data: `stivo://box/${INVERNO}` });
    });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('inserimento manuale funziona anche senza permesso fotocamera', async () => {
    mockGranted = false;
    render(<ScanScreen />);
    expect(screen.getByTestId('scan-permission')).toBeTruthy();
    const user = userEvent.setup();
    await user.type(screen.getByTestId('scan-manual-input'), 'stivo://box/xyz');
    await user.press(screen.getByTestId('scan-manual-submit'));
    expect(screen.getByTestId('scan-error')).toHaveTextContent(/Questo QR non è di Stivo/);
    await user.clear(screen.getByTestId('scan-manual-input'));
    await user.type(screen.getByTestId('scan-manual-input'), `stivo://box/${INVERNO}`);
    await user.press(screen.getByTestId('scan-manual-submit'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/box/[id]', params: { id: INVERNO } });
  });
});
