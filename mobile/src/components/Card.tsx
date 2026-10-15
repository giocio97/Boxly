import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, useTheme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, testID, style, accessibilityLabel }: CardProps) {
  const { colors } = useTheme();
  const base = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style];
  if (!onPress) {
    return (
      <View testID={testID} style={base}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.85 : 1 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, padding: space.lg },
});
