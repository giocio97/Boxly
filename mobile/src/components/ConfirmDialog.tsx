import { Modal, StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialogo di conferma: pulsanti con testID `confirm-yes` / `confirm-no` (CONTRACT §6). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          testID="confirm-dialog"
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="section">{title}</AppText>
          {message ? <AppText muted>{message}</AppText> : null}
          <View style={styles.actions}>
            <Button testID="confirm-no" title={cancelLabel} kind="secondary" onPress={onCancel} style={styles.flex} />
            <Button
              testID="confirm-yes"
              title={confirmLabel}
              kind={destructive ? 'danger' : 'primary'}
              loading={loading}
              onPress={onConfirm}
              style={styles.flex}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: space.xl },
  sheet: { borderRadius: radius.card, borderWidth: 1, padding: space.xl, gap: space.md },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  flex: { flex: 1, paddingHorizontal: space.sm },
});
