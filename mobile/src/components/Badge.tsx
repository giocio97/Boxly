import type { BoxRole, Season } from '@shared/types';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { roleLabel, seasonLabel } from '@/lib/labels';
import { radius, space, seasonColors, useTheme } from '@/theme';
import { AppText } from './AppText';

export function Badge({
  label,
  color,
  testID,
  filled,
  style,
}: {
  label: string;
  color: string;
  testID?: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      style={[styles.badge, { borderColor: color, backgroundColor: filled ? color : color + '22' }, style]}>
      <AppText variant="label" color={filled ? '#FFFFFF' : color}>
        {label}
      </AppText>
    </View>
  );
}

export function SeasonBadge({ season, style }: { season: Season | null | undefined; style?: StyleProp<ViewStyle> }) {
  const { dark } = useTheme();
  if (!season) return null;
  return <Badge label={seasonLabel[season]} color={seasonColors[season]} filled={!dark} style={style} />;
}

export function RoleBadge({ role, testID }: { role: BoxRole; testID?: string }) {
  const { colors } = useTheme();
  return <Badge label={roleLabel[role]} color={colors.accent} testID={testID} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 2,
  },
});
