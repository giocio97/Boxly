import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { ErrorText, Loading, Screen } from '@/components/Screen';
import { parseBoxQr } from '@/lib/qr';
import { radius, space, useTheme } from '@/theme';

export default function ScanScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const lastData = useRef<string | null>(null);
  const locked = useRef(false);

  function handleValue(data: string): boolean {
    const id = parseBoxQr(data);
    if (!id) {
      setError(t('scan.notOurs'));
      return false;
    }
    setError(null);
    router.push({ pathname: '/box/[id]', params: { id } });
    return true;
  }

  function onScanned(result: BarcodeScanningResult) {
    if (locked.current) return;
    if (result.data === lastData.current && error) return; // stesso QR non valido: non ripetere
    lastData.current = result.data;
    if (handleValue(result.data)) {
      locked.current = true;
      setTimeout(() => {
        locked.current = false;
        lastData.current = null;
      }, 1500);
    }
  }

  const manualEntry = (
    <View style={styles.manual}>
      <Input
        testID="scan-manual-input"
        placeholder={t('scan.manualPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        value={manual}
        onChangeText={setManual}
        onSubmitEditing={() => manual.trim() && handleValue(manual)}
      />
      <Button
        testID="scan-manual-submit"
        title={t('common.open')}
        kind="secondary"
        small
        onPress={() => manual.trim() && handleValue(manual)}
      />
    </View>
  );

  if (!permission) return <Loading />;

  if (!permission.granted) {
    return (
      <Screen scroll>
        <EmptyState
          testID="scan-permission"
          icon="camera-outline"
          title={t('scan.permissionTitle')}
          message={t('scan.permissionMessage')}
          action={
            <Button testID="scan-allow-camera" title={t('scan.allowCamera')} onPress={requestPermission} />
          }
        />
        <ErrorText testID="scan-error">{error}</ErrorText>
        {manualEntry}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={[styles.cameraWrap, { borderColor: colors.accent }]}>
        {focused ? (
          <CameraView
            testID="scan-camera"
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
        ) : null}
        <View pointerEvents="none" style={[styles.frame, { borderColor: colors.accent }]} />
      </View>
      <AppText muted style={styles.center}>
        {t('scan.hint')}
      </AppText>
      <ErrorText testID="scan-error">{error}</ErrorText>
      {manualEntry}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.card,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { width: '60%', aspectRatio: 1, borderWidth: 3, borderRadius: radius.card },
  center: { textAlign: 'center' },
  manual: { gap: space.sm, marginTop: space.md },
});
