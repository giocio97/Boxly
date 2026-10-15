import { Text, type TextProps } from 'react-native';

import { fonts, fontSize, useTheme } from '@/theme';

type Variant = 'title' | 'section' | 'body' | 'bodyStrong' | 'secondary' | 'label';

const variants: Record<Variant, { fontFamily: string; fontSize: number; lineHeight: number }> = {
  title: { fontFamily: fonts.bold, fontSize: fontSize.screenTitle, lineHeight: 34 },
  section: { fontFamily: fonts.semibold, fontSize: fontSize.section, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: fontSize.body, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: fontSize.body, lineHeight: 22 },
  secondary: { fontFamily: fonts.regular, fontSize: fontSize.secondary, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: fontSize.label, lineHeight: 16 },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
}

export function AppText({ variant = 'body', muted, color, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[variants[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
      {...rest}
    />
  );
}
