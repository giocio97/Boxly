import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';

import { AuthProvider, setPendingHref, takePendingHref, useAuth } from '@/lib/auth';
import { fonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Warning solo-dev interno a expo-router (NavigationContainer → setLastUnhandledLink chiamato
// dalla promise dell'URL iniziale prima del mount, succede in Expo Go). Non dipende dal codice
// dell'app; il toast di LogBox in basso copriva la tab bar su Android.
LogBox.ignoreLogs(["Can't perform a React state update on a component that hasn't mounted yet"]);

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
        <Stack.Screen name="box/new" options={{ title: 'Nuova scatola' }} />
        <Stack.Screen name="box/[id]/index" options={{ title: 'Scatola' }} />
        <Stack.Screen name="box/[id]/edit" options={{ title: 'Modifica scatola' }} />
        <Stack.Screen name="box/[id]/qr" options={{ title: 'Etichetta QR' }} />
        <Stack.Screen name="box/[id]/share" options={{ title: 'Condivisione' }} />
        <Stack.Screen name="box/[id]/history" options={{ title: 'Storico' }} />
        <Stack.Screen name="item/new" options={{ title: 'Nuovo oggetto' }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Oggetto' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  if (!fontsLoaded && !fontError) return null;
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
