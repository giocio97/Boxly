import type { BoxOverview } from '@shared/types';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppText } from '@/components/AppText';
import { SeasonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorText, Loading, Screen } from '@/components/Screen';
import { getBox } from '@/lib/api';
import { APP_NAME } from '@/lib/brand';
import { LABEL_PT, labelHtml } from '@/lib/label';
import { boxQrValue } from '@/lib/qr';
import { radius, space, useTheme } from '@/theme';

export default function BoxQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [box, setBox] = useState<BoxOverview | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'print' | 'share' | null>(null);

  useEffect(() => {
    getBox(id).then((res) => setBox(res.data ?? null));
  }, [id]);

  async function print() {
    if (!box) return;
    setBusy('print');
    setError(null);
    try {
      await Print.printAsync({ html: labelHtml(box, false) });
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (!/cancel|did not complete/i.test(msg)) setError(t('boxes.qr.printError'));
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    if (!box) return;
    setBusy('share');
    setError(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError(t('boxes.qr.shareUnavailable'));
        return;
      }
      // In Expo Go su Android il file creato da expo-print non è leggibile da expo-sharing né da
      // expo-file-system: chiediamo il PDF in base64 e lo scriviamo noi nella cache dell'app,
      // con un nome leggibile.
      const { base64 } = await Print.printToFileAsync({
        html: labelHtml(box, true),
        width: LABEL_PT,
        height: LABEL_PT,
        margins: { left: 0, right: 0, top: 0, bottom: 0 },
        base64: true,
      });
      if (!base64) throw new Error('PDF vuoto');
      const pdf = new File(Paths.cache, `${t('boxes.qr.fileName')}-${labelFileName(box.name, t('boxes.qr.fileFallback'))}.pdf`);
      if (pdf.exists) pdf.delete();
      pdf.create();
      pdf.write(base64, { encoding: 'base64' });
      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: t('boxes.qr.shareTitle', { name: box.name }),
      });
    } catch (e) {
      console.warn('[label] condivisione etichetta fallita', e);
      setError(t('boxes.qr.shareError'));
    } finally {
      setBusy(null);
    }
  }

  if (box === undefined) return <Loading />;
  if (!box) return <EmptyState title={t('common.boxUnavailable')} icon="lock-closed-outline" />;

  return (
    <Screen scroll style={styles.center}>
      <View style={[styles.label, { borderColor: colors.primary }]}>
        <View testID="qr-code" accessible accessibilityLabel={t('boxes.qr.a11y', { name: box.name })} style={styles.qrWrap}>
          <QRCode value={boxQrValue(box.id)} size={200} color="#000000" backgroundColor="#FFFFFF" quietZone={8} />
        </View>
        <AppText variant="section" color="#1E1B16" style={styles.text} numberOfLines={2}>
          {box.name}
        </AppText>
        {box.location ? (
          <AppText variant="secondary" color="#6B645A" style={styles.text}>
            {box.location}
          </AppText>
        ) : null}
        <SeasonBadge season={box.season} style={styles.centerSelf} />
        <AppText variant="label" color="#B8742F">
          {APP_NAME}
        </AppText>
      </View>
      <AppText muted style={styles.text}>
        {t('boxes.qr.hint')}
      </AppText>
      <ErrorText testID="qr-error">{error}</ErrorText>
      <View style={styles.actions}>
        <Button
          testID="print-label-button"
          title={t('boxes.qr.print')}
          icon="print-outline"
          loading={busy === 'print'}
          disabled={!!busy}
          onPress={print}
        />
        <Button
          testID="share-qr-button"
          title={t('boxes.qr.share')}
          icon="share-outline"
          kind="secondary"
          loading={busy === 'share'}
          disabled={!!busy}
          onPress={share}
        />
      </View>
    </Screen>
  );
}

/** Nome file sicuro: minuscole, senza accenti, solo lettere/numeri e trattini. */
function labelFileName(name: string, fallback: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  label: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    padding: space.lg,
    alignItems: 'center',
    gap: space.sm,
    width: 280,
  },
  qrWrap: { padding: 4, backgroundColor: '#FFFFFF' },
  text: { textAlign: 'center' },
  centerSelf: { alignSelf: 'center' },
  actions: { alignSelf: 'stretch', gap: space.md },
});
