import { useColorScheme } from 'react-native';
import type { Season } from '@shared/types';

/** Palette da BRAND.md */
export const palette = {
  light: {
    background: '#FAF7F2',
    surface: '#FFFFFF',
    text: '#1E1B16',
    textMuted: '#6B645A',
    border: '#E7E0D5',
    primary: '#B8742F',
    onPrimary: '#FFFFFF',
    accent: '#1F7A6D',
    danger: '#B42318',
    success: '#2F7D32',
  },
  dark: {
    background: '#15130F',
    surface: '#1F1C17',
    text: '#F3EEE6',
    textMuted: '#A39B8F',
    border: '#2E2A23',
    primary: '#D9995A',
    onPrimary: '#15130F',
    accent: '#3FB3A2',
    danger: '#F97066',
    success: '#6CC070',
  },
} as const;

export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };

export const seasonColors: Record<Season, string> = {
  spring: '#7FB069',
  summer: '#F2B134',
  autumn: '#C8553D',
  winter: '#4A7FB5',
  all: '#8A8178',
};

export const fonts = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const fontSize = {
  screenTitle: 28,
  section: 20,
  body: 16,
  secondary: 14,
  label: 12,
} as const;

export const radius = { card: 12, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { dark, colors: dark ? palette.dark : palette.light };
}
