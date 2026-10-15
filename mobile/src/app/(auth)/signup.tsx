import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHeader } from '@/components/AuthHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ErrorText, Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { space, useTheme } from '@/theme';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Inserisci email e password.');
      return;
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await signUp(email, password, name);
    setBusy(false);
    if (err) setError(errorMessage(err, 'Registrazione non riuscita. Riprova.'));
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Screen scroll>
        <AuthHeader subtitle="Crea il tuo account e inizia a riempire le scatole." />
        <Input
          testID="signup-name"
          nextRef={emailRef}
          label="Nome"
          placeholder="Come ti chiami?"
          autoCapitalize="words"
          textContentType="name"
          value={name}
          onChangeText={setName}
        />
        <Input
          ref={emailRef}
          testID="signup-email"
          nextRef={passwordRef}
          label="Email"
          placeholder="nome@esempio.it"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          ref={passwordRef}
          testID="signup-password"
          returnKeyType="go"
          label="Password"
          placeholder="Almeno 6 caratteri"
          secureTextEntry
          // niente "Password sicura automatica" di iOS: copre il campo e blocca il tap su Crea account
          textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'newPassword'}
          autoComplete={Platform.OS === 'ios' ? 'off' : 'new-password'}
          autoCorrect={false}
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />
        <ErrorText testID="auth-error">{error}</ErrorText>
        <Button testID="signup-submit" title="Crea account" onPress={submit} loading={busy} />
        <Button testID="goto-login" title="Hai già un account? Accedi" kind="ghost" onPress={() => router.replace('/login')} style={{ marginTop: space.sm }} />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
