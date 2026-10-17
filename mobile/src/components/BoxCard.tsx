import Ionicons from '@expo/vector-icons/Ionicons';
import type { BoxOverview } from '@shared/types';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { RoleBadge, SeasonBadge } from './Badge';
import { Card } from './Card';

export function BoxCard({ box, onPress }: { box: BoxOverview; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const count = box.item_count ?? 0;
  return (
    <Card testID={`box-card-${box.id}`} onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="cube" size={28} color={colors.primary} />
        </View>
        <View style={styles.body}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {box.name}
          </AppText>
          <AppText variant="secondary" muted numberOfLines={1}>
            {[box.location, t('common.itemCount', { count })].filter(Boolean).join(' · ')}
          </AppText>
          <View style={styles.badges}>
            <SeasonBadge season={box.season} />
            {box.my_role !== 'owner' ? <RoleBadge role={box.my_role} /> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 52, height: 52, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', gap: space.sm, marginTop: space.xs, flexWrap: 'wrap' },
});
