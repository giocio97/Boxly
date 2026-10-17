import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError(t('auth.missingFields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.signup.passwordTooShort'));
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await signUp(email, password, name);
    setBusy(false);
    if (err) setError(errorMessage(err, t('auth.signup.failed')));
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Screen scroll>
        <AuthHeader subtitle={t('auth.signup.subtitle')} />
        <Input
          testID="signup-name"
          nextRef={emailRef}
          label={t('auth.signup.name')}
          placeholder={t('auth.signup.namePlaceholder')}
          autoCapitalize="words"
          textContentType="name"
          value={name}
          onChangeText={setName}
        />
        <Input
          ref={emailRef}
          testID="signup-email"
          nextRef={passwordRef}
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
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
          label={t('auth.password')}
          placeholder={t('auth.signup.passwordPlaceholder')}
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
        <Button testID="signup-submit" title={t('auth.signup.submit')} onPress={submit} loading={busy} />
        <Button testID="goto-login" title={t('auth.signup.toLogin')} kind="ghost" onPress={() => router.replace('/login')} style={{ marginTop: space.sm }} />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
