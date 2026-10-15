import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, useTheme } from '@/theme';
import { AppText } from './AppText';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  testID?: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, icon = 'cube-outline', testID, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={styles.wrap}>
      <Ionicons name={icon} size={48} color={colors.primary} />
      <AppText variant="section" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText muted style={styles.center}>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  center: { textAlign: 'center' },
});
