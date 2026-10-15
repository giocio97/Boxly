import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';
import { AppText } from './AppText';

type Reveal = (target: View | null) => void;
const RevealContext = createContext<Reveal | null>(null);

/** Per i campi dentro <Screen scroll>: porta il campo attivo sopra la tastiera. */
export function useRevealOnFocus(): Reveal {
  return useContext(RevealContext) ?? (() => {});
}

/** Contenitore schermata con sfondo del tema e padding 16. */
export function Screen({
  children,
  scroll,
  style,
  testID,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** azioni fisse in basso (es. Salva), sempre visibili sopra la tastiera */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const target = useRef<View | null>(null);
  const viewH = useRef(0);
  const kbH = useRef(0);
  const safeBottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const [kbPad, setKbPad] = useState(0);

  // porta il campo attivo (e ~140pt sotto, dove di solito c'è il pulsante) sopra la tastiera
  const scrollToTarget = useCallback(() => {
    const t = target.current;
    const content = contentRef.current;
    if (!t || !content || !kbH.current) return;
    t.measureLayout(
      content,
      (_x, y, _w, h) => {
        // con footer la ScrollView è già sopra la tastiera; senza, la tastiera la copre in basso
        const visible = footer ? viewH.current : viewH.current - kbH.current;
        const wanted = Math.min(y - space.lg, y + h + (footer ? space.lg : 140) - visible);
        scrollRef.current?.scrollTo({ y: Math.max(0, wanted), animated: true });
      },
      () => {},
    );
  }, [footer]);

  useEffect(() => {
    if (!footer || Platform.OS !== 'ios') return;
    // iOS non ridimensiona la finestra: alza il footer di quanto è alta la tastiera
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKbPad(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKbPad(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [footer]);

  useEffect(() => {
    if (!scroll) return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      kbH.current = e.endCoordinates.height;
      scrollToTarget();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      kbH.current = 0;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scroll, scrollToTarget]);

  const reveal = useCallback<Reveal>(
    (t) => {
      target.current = t;
      // tastiera già aperta (cambio campo): scorri subito; altrimenti ci pensa keyboardDidShow
      if (kbH.current) setTimeout(scrollToTarget, 50);
    },
    [scrollToTarget],
  );
  if (scroll) {
    return (
      <RevealContext.Provider value={reveal}>
        <ScrollView
          ref={scrollRef}
          onLayout={(e) => {
            viewH.current = e.nativeEvent.layout.height;
          }}
          testID={testID}
          style={[styles.flex, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.grow}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive">
          <View ref={contentRef} style={[styles.content, style]}>
            {children}
          </View>
        </ScrollView>
        {footer ? (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: kbPad ? space.md : Math.max(safeBottom, space.md),
                marginBottom: kbPad,
              },
            ]}>
            {footer}
          </View>
        ) : null}
      </RevealContext.Provider>
    );
  }
  return (
    <View testID={testID} style={[styles.flex, styles.content, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function ErrorText({ children, testID }: { children: ReactNode; testID?: string }) {
  const { colors } = useTheme();
  if (!children) return null;
  return (
    <AppText testID={testID} variant="secondary" color={colors.danger} accessibilityRole="alert">
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  content: { padding: space.lg, gap: space.md, flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
