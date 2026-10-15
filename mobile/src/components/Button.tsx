import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';

type Kind = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  kind?: Kind;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}

export function Button({ title, onPress, kind = 'primary', icon, loading, disabled, testID, style, small }: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const bg = kind === 'primary' ? colors.primary : 'transparent';
  const fg =
    kind === 'primary' ? colors.onPrimary : kind === 'danger' ? colors.danger : kind === 'ghost' ? colors.accent : colors.text;
  const borderColor = kind === 'secondary' ? colors.border : kind === 'danger' ? colors.danger : 'transparent';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: bg, borderColor, opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={fg} size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={small ? 16 : 18} color={fg} />
        ) : null}
        <AppText style={[styles.label, small && styles.smallLabel]} color={fg}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 36, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontFamily: fonts.semibold, fontSize: 16 },
  smallLabel: { fontSize: 14 },
});
