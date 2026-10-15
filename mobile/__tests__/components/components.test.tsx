import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import type { Season } from '@shared/types';

import { RoleBadge, SeasonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { SeasonPicker } from '@/components/SeasonPicker';

describe('Button', () => {
  // userEvent simula il tocco reale sull'host (fireEvent risalirebbe alla prop onPress del componente)
  it('disabled non chiama onPress', async () => {
    const onPress = jest.fn();
    render(<Button testID="b" title="Salva" onPress={onPress} disabled />);
    await userEvent.setup().press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('b').props.accessibilityState.disabled).toBe(true);
  });

  it('loading non chiama onPress (no doppio invio)', async () => {
    const onPress = jest.fn();
    render(<Button testID="b" title="Salva" onPress={onPress} loading />);
    await userEvent.setup().press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog', () => {
  it('confirm-yes / confirm-no', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<ConfirmDialog visible title="Eliminare la scatola?" onConfirm={onConfirm} onCancel={onCancel} destructive />);
    expect(screen.getByText('Eliminare la scatola?')).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirm-no'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('confirm-yes'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('non visibile → nessun pulsante', () => {
    render(<ConfirmDialog visible={false} title="x" onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.queryByTestId('confirm-yes')).toBeNull();
  });

  it('loading blocca la conferma', async () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog visible loading title="x" onConfirm={onConfirm} onCancel={jest.fn()} />);
    await userEvent.setup().press(screen.getByTestId('confirm-yes'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('SeasonPicker', () => {
  function Harness({ prefix, onValue }: { prefix: string; onValue: (s: Season | null) => void }) {
    const [v, setV] = useState<Season | null>(null);
    return (
      <SeasonPicker
        value={v}
        testIDPrefix={prefix}
        onChange={(s) => {
          setV(s);
          onValue(s);
        }}
      />
    );
  }

  it('renderizza i testID del contratto per box e item', () => {
    for (const prefix of ['box-season', 'item-season']) {
      const { unmount } = render(<Harness prefix={prefix} onValue={jest.fn()} />);
      for (const s of ['spring', 'summer', 'autumn', 'winter', 'all']) {
        expect(screen.getByTestId(`${prefix}-${s}`)).toBeTruthy();
      }
      unmount();
    }
  });

  it('seleziona e deseleziona', () => {
    const onValue = jest.fn();
    render(<Harness prefix="box-season" onValue={onValue} />);
    fireEvent.press(screen.getByTestId('box-season-winter'));
    expect(onValue).toHaveBeenLastCalledWith('winter');
    expect(screen.getByTestId('box-season-winter').props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByTestId('box-season-summer'));
    expect(onValue).toHaveBeenLastCalledWith('summer');
    expect(screen.getByTestId('box-season-winter').props.accessibilityState.selected).toBe(false);
    fireEvent.press(screen.getByTestId('box-season-summer'));
    expect(onValue).toHaveBeenLastCalledWith(null);
  });
});

describe('Badge / EmptyState', () => {
  it('RoleBadge mostra l’etichetta italiana', () => {
    render(<RoleBadge role="viewer" testID="role-badge" />);
    expect(screen.getByTestId('role-badge')).toBeTruthy();
    expect(screen.getByText('Solo lettura')).toBeTruthy();
  });

  it('SeasonBadge null non renderizza nulla', () => {
    const { toJSON } = render(<SeasonBadge season={null} />);
    expect(toJSON()).toBeNull();
  });

  it('EmptyState con testID', () => {
    render(<EmptyState testID="empty-boxes" title="Ancora nessuna scatola." message="Creane una e inizia a riempirla." />);
    expect(screen.getByTestId('empty-boxes')).toBeTruthy();
    expect(screen.getByText('Creane una e inizia a riempirla.')).toBeTruthy();
  });
});
