import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { ErrorText, Loading, Screen } from '@/components/Screen';
import { parseBoxQr } from '@/lib/qr';
import { radius, space, useTheme } from '@/theme';

const NOT_BOXLY = 'Questo QR non è di Boxly';

export default function ScanScreen() {
  const { colors } = useTheme();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const lastData = useRef<string | null>(null);
  const locked = useRef(false);

  function handleValue(data: string): boolean {
    const id = parseBoxQr(data);
    if (!id) {
      setError(NOT_BOXLY);
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
        placeholder="…oppure incolla il codice (boxly://box/…)"
        autoCapitalize="none"
        autoCorrect={false}
        value={manual}
        onChangeText={setManual}
        onSubmitEditing={() => manual.trim() && handleValue(manual)}
      />
      <Button
        testID="scan-manual-submit"
        title="Apri"
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
          title="Serve la fotocamera"
          message="Per leggere il QR sulla scatola consenti a Boxly di usare la fotocamera."
          action={
            <Button testID="scan-allow-camera" title="Consenti fotocamera" onPress={requestPermission} />
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
        Inquadra il QR sull&apos;etichetta della scatola.
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
