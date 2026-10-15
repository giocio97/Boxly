import { forwardRef, useRef, type RefObject } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { useRevealOnFocus } from './Screen';

export interface InputProps extends TextInputProps {
  label?: string;
  multiline?: boolean;
  /** campo successivo: il tasto Invio della tastiera ci sposta il focus */
  nextRef?: RefObject<TextInput | null>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, style, multiline, nextRef, onFocus, onSubmitEditing, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const reveal = useRevealOnFocus();
  const wrapRef = useRef<View>(null);
  return (
    <View ref={wrapRef} style={styles.wrap}>
      {label ? (
        <AppText variant="label" muted>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        {...rest}
        multiline={multiline}
        onFocus={(e) => {
          reveal(wrapRef.current);
          onFocus?.(e);
        }}
        returnKeyType={nextRef ? 'next' : rest.returnKeyType}
        submitBehavior={nextRef ? 'submit' : rest.submitBehavior}
        onSubmitEditing={(e) => {
          if (nextRef) nextRef.current?.focus();
          onSubmitEditing?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          style,
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
