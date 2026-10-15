import type { Season } from '@shared/types';
import { Pressable, StyleSheet, View } from 'react-native';

import { SEASONS, seasonLabel } from '@/lib/labels';
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
  return (
    <View style={styles.wrap}>
      <AppText variant="label" muted>
        Stagione
      </AppText>
      <View style={styles.row}>
        {SEASONS.map((s) => {
          const selected = value === s;
          return (
            <Pressable
              key={s}
              testID={`${testIDPrefix}-${s}`}
              accessibilityRole="radio"
              accessibilityLabel={seasonLabel[s]}
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
                {seasonLabel[s]}
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
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accent : colors.surface,
        },
      ]}>
      <AppText variant="secondary" color={selected ? '#FFFFFF' : colors.text}>
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
});
