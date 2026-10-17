import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogBox } from 'react-native';

import { loadSavedLanguage } from '@/i18n';

import { AuthProvider, setPendingHref, takePendingHref, useAuth } from '@/lib/auth';
import { fonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Warning solo-dev interno a expo-router (NavigationContainer → setLastUnhandledLink chiamato
// dalla promise dell'URL iniziale prima del mount, succede in Expo Go). Non dipende dal codice
// dell'app; il toast di LogBox in basso copriva la tab bar su Android.
// Lo schema `boxly` resta accanto a `stivo` per le etichette vecchie (CONTRACT v2.1). expo-router chiama
// Linking.createURL('/') senza schema, quindi expo-linking avvisa che usa 'stivo' e ignora gli altri: è
// voluto, e il toast copriva tab bar e footer dei form (BUG-101).
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
  'Linking found multiple possible URI schemes in your Expo config',
]);

export const unstable_settings = {
  // un deep link a box/[id] a freddo mantiene le tab sotto, così "indietro" funziona
  initialRouteName: '(tabs)',
};

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { dark, colors } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => {});
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      if (/^\/(box|item)\//.test(pathname) && pathname !== '/box/new') setPendingHref(pathname);
      router.replace('/login');
    } else if (session && inAuth) {
      const pending = takePendingHref();
      router.replace('/');
      if (pending) setTimeout(() => router.push(pending as never), 0);
    }
  }, [session, loading, segments, pathname, router]);

  const navTheme = dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fonts.semibold, color: colors.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: t('nav.search') }} />
        <Stack.Screen name="box/new" options={{ title: t('nav.newBox') }} />
        <Stack.Screen name="box/[id]/index" options={{ title: t('nav.box') }} />
        <Stack.Screen name="box/[id]/edit" options={{ title: t('nav.editBox') }} />
        <Stack.Screen name="box/[id]/qr" options={{ title: t('nav.qr') }} />
        <Stack.Screen name="box/[id]/share" options={{ title: t('nav.share') }} />
        <Stack.Screen name="box/[id]/history" options={{ title: t('nav.history') }} />
        <Stack.Screen name="item/new" options={{ title: t('nav.newItem') }} />
        <Stack.Screen name="item/[id]" options={{ title: t('nav.item') }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  // lingua salvata (stivo.lang) applicata prima del primo render, per non mostrare l'altra lingua
  const [langReady, setLangReady] = useState(false);
  useEffect(() => {
    loadSavedLanguage().finally(() => setLangReady(true));
  }, []);
  if ((!fontsLoaded && !fontError) || !langReady) return null;
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
