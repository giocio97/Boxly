import type { Profile } from '@shared/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getMyProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { space, useTheme } from '@/theme';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = session?.user.id;

  useFocusEffect(
    useCallback(() => {
      if (userId) getMyProfile(userId).then((r) => setProfile(r.data ?? null));
    }, [userId]),
  );

  const email = profile?.email ?? session?.user.email ?? '';
  const name = profile?.display_name || email.split('@')[0];

  return (
    <Screen>
      <Card style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <AppText variant="section" color={colors.onPrimary}>
            {(name[0] ?? '?').toUpperCase()}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{name}</AppText>
          <AppText testID="profile-email" muted>
            {email}
          </AppText>
        </View>
      </Card>
      <View style={styles.flex} />
      <Button
        testID="logout-button"
        title="Esci"
        icon="log-out-outline"
        kind="danger"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await signOut();
        }}
      />
      <AppText variant="label" muted style={styles.center}>
        Boxly · Sai sempre cosa c&apos;è dentro.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
