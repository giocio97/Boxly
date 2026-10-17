import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { fonts, radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';

/** Barra con aspetto da input: al tocco apre la ricerca (CONTRACT v2.4). */
export function HomeSearchBar({ placeholder, onPress }: { placeholder: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID="home-search-bar"
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bar,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <AppText muted numberOfLines={1} style={styles.text}>
        {placeholder}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  text: { flex: 1, fontFamily: fonts.regular },
});
