import Ionicons from '@expo/vector-icons/Ionicons';
import type { Item, ItemAttributes, ItemType, Season } from '@shared/types';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { itemTypeIcon } from '@/lib/itemTypes';
import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { SeasonBadge } from './Badge';
import { Card } from './Card';

export function Thumb({
  url,
  size = 52,
  icon = 'shirt-outline',
}: {
  url?: string | null;
  size?: number;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const { colors } = useTheme();
  if (url) {
    return <Image source={{ uri: url }} style={[styles.thumb, { width: size, height: size }]} contentFit="cover" />;
  }
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: colors.border }]}>
      <Ionicons name={icon} size={size / 2} color={colors.textMuted} />
    </View>
  );
}

export function ItemRow({
  item,
  photoUrl,
  subtitle,
  onPress,
  testID,
}: {
  item: Pick<Item, 'id' | 'name' | 'brand' | 'color' | 'size' | 'category'> & {
    season: Season | null;
    item_type?: ItemType | null;
    attributes?: ItemAttributes | null;
  };
  photoUrl?: string | null;
  subtitle?: string;
  onPress: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const type = item.item_type ?? 'other';
  const icon = itemTypeIcon(type);
  const attrs = item.attributes ?? {};
  const details =
    subtitle ?? [attrs.author, attrs.model, item.category, item.brand, item.color, item.size].filter(Boolean).join(' · ');
  return (
    <Card testID={testID} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Thumb url={photoUrl} icon={icon} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View
              testID={`item-type-icon-${item.id}`}
              accessible
              accessibilityLabel={t(`itemTypes.${type}`)}
              style={[styles.typeIcon, { backgroundColor: colors.accent + '22' }]}>
              <Ionicons name={icon} size={14} color={colors.accent} />
            </View>
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
              {item.name}
            </AppText>
          </View>
          {details ? (
            <AppText variant="secondary" muted numberOfLines={1}>
              {details}
            </AppText>
          ) : null}
          <SeasonBadge season={item.season} />
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  typeIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
