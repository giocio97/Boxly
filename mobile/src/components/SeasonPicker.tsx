import Ionicons from '@expo/vector-icons/Ionicons';
import type { Season } from '@shared/types';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { SEASONS } from '@/lib/labels';
import { radius, space, seasonColors, useTheme } from '@/theme';
import { AppText } from './AppText';

export interface SeasonPickerProps {
  value: Season | null;
  onChange: (s: Season | null) => void;
  /** prefisso testID: `box-season` o `item-season` */
  testIDPrefix: string;
}

/** Selettore stagione a chip; toccare di nuovo la stagione scelta la deseleziona. */
export function SeasonPicker({ value, onChange, testIDPrefix }: SeasonPickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <AppText variant="label" muted>
        {t('seasons.label')}
      </AppText>
      <View style={styles.row}>
        {SEASONS.map((s) => {
          const selected = value === s;
          const label = t(`seasons.${s}`);
          return (
            <Pressable
              key={s}
              testID={`${testIDPrefix}-${s}`}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(selected ? null : s)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? seasonColors[s] : colors.border,
                  backgroundColor: selected ? seasonColors[s] : colors.surface,
                },
              ]}>
              <AppText variant="secondary" color={selected ? '#FFFFFF' : colors.text}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
  testID,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const { colors } = useTheme();
  const fg = selected ? '#FFFFFF' : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        icon && styles.chipWithIcon,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accent : colors.surface,
        },
      ]}>
      {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <AppText variant="secondary" color={fg}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipWithIcon: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
});
