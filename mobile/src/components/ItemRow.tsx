import Ionicons from '@expo/vector-icons/Ionicons';
import type { Item, Season } from '@shared/types';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { SeasonBadge } from './Badge';
import { Card } from './Card';

export function Thumb({ url, size = 52 }: { url?: string | null; size?: number }) {
  const { colors } = useTheme();
  if (url) {
    return <Image source={{ uri: url }} style={[styles.thumb, { width: size, height: size }]} contentFit="cover" />;
  }
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: colors.border }]}>
      <Ionicons name="shirt-outline" size={size / 2} color={colors.textMuted} />
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
  item: Pick<Item, 'id' | 'name' | 'brand' | 'color' | 'size' | 'category'> & { season: Season | null };
  photoUrl?: string | null;
  subtitle?: string;
  onPress: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const details = subtitle ?? [item.category, item.brand, item.color, item.size].filter(Boolean).join(' · ');
  return (
    <Card testID={testID} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Thumb url={photoUrl} />
        <View style={styles.body}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {item.name}
          </AppText>
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
});
