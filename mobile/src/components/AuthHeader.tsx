import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { APP_NAME } from '@/lib/brand';
import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';

/** Wordmark del brand + payoff, per le schermate di accesso. */
export function AuthHeader({ subtitle }: { subtitle?: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={[styles.logo, { backgroundColor: colors.primary }]}>
        <Ionicons name="cube-outline" size={40} color={colors.onPrimary} />
        <View style={[styles.qr, { backgroundColor: colors.accent }]}>
          <Ionicons name="qr-code" size={14} color="#FFFFFF" />
        </View>
      </View>
      <AppText variant="title" style={styles.word}>
        {APP_NAME}
      </AppText>
      <AppText muted>{subtitle ?? t('common.tagline')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, marginTop: space.xxl, marginBottom: space.xl },
  logo: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qr: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: radius.card / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: { fontSize: 34, lineHeight: 40 },
});
