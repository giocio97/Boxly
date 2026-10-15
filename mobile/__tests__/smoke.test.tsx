import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/Button';
import { parseBoxQr } from '@/lib/qr';

// Smoke test: verifica solo che la config Jest (jest-expo + RNTL + alias @/) funzioni.
describe('smoke', () => {
  it('renderizza un Button e gestisce il tap', () => {
    const onPress = jest.fn();
    render(<Button testID="smoke-button" title="Aggiungi" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('smoke-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Aggiungi')).toBeTruthy();
  });

  it('accetta solo QR Boxly', () => {
    expect(parseBoxQr('boxly://box/11111111-1111-1111-1111-000000000001')).toBe(
      '11111111-1111-1111-1111-000000000001',
    );
    expect(parseBoxQr('https://example.com')).toBeNull();
  });
});
