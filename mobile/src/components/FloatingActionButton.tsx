import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';
import { Button } from './Button';

/** Distanza dal fondo: lascia libero il pulsante centrale della tab bar, che sporge di ~24 px. */
const FAB_BOTTOM = space.xl + space.lg;
/** Altezza occupata dalla pillola flottante: le liste sotto aggiungono questo padding in fondo. */
export const FAB_SPACE = 48 + FAB_BOTTOM + space.lg;

/** Pillola primaria flottante in basso al centro, sopra il contenuto (CONTRACT v2.4). */
export function FloatingActionButton({
  title,
  icon,
  onPress,
  testID,
}: {
  title: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  testID?: string;
}) {
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Button testID={testID} title={title} icon={icon} onPress={onPress} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: FAB_BOTTOM, alignItems: 'center' },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
