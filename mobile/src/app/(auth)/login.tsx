import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AuthHeader } from '@/components/AuthHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ErrorText, Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { space, useTheme } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Inserisci email e password.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) setError(errorMessage(err, 'Accesso non riuscito. Riprova.'));
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Screen scroll>
        <AuthHeader />
        <Input
          testID="login-email"
          nextRef={passwordRef}
          label="Email"
          placeholder="nome@esempio.it"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          ref={passwordRef}
          testID="login-password"
          label="Password"
          placeholder="La tua password"
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        <ErrorText testID="auth-error">{error}</ErrorText>
        <Button testID="login-submit" title="Accedi" onPress={submit} loading={busy} />
        <Button testID="goto-signup" title="Non hai un account? Registrati" kind="ghost" onPress={() => router.replace('/signup')} style={{ marginTop: space.sm }} />
        <AppText variant="secondary" muted style={styles.center}>
          I tuoi oggetti, sempre a portata di QR.
        </AppText>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', marginTop: space.lg },
});
