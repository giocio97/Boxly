import type { BoxOverview, BoxShareMember, ShareRole } from '@shared/types';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { RoleBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { ErrorText, Loading, Screen } from '@/components/Screen';
import { ChoiceChip } from '@/components/SeasonPicker';
import { getBox, listShareMembers, revokeShare, shareBox } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { space, useTheme } from '@/theme';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const me = session?.user.id;
  const [box, setBox] = useState<BoxOverview | null | undefined>(undefined);
  const [members, setMembers] = useState<BoxShareMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toRevoke, setToRevoke] = useState<BoxShareMember | null>(null);

  const load = useCallback(async () => {
    const [b, m] = await Promise.all([getBox(id), listShareMembers(id)]);
    setBox(b.data ?? null);
    setMembers(m.data ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function submit() {
    if (!email.trim()) {
      setError(t('boxes.share.emailRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await shareBox(id, email, role);
    setBusy(false);
    if (res.error) {
      setError(errorMessage(res.error, t('boxes.share.error')));
      return;
    }
    setNotice(t('boxes.share.success', { email: email.trim() }));
    setEmail('');
    await load();
  }

  async function revoke() {
    if (!toRevoke) return;
    setBusy(true);
    const res = await revokeShare(id, toRevoke.user_id);
    setBusy(false);
    const leaving = toRevoke.user_id === me;
    setToRevoke(null);
    if (res.error) {
      setError(errorMessage(res.error, t('boxes.share.revokeError')));
      return;
    }
    if (leaving) {
      router.dismissTo('/');
      return;
    }
    await load();
  }

  if (box === undefined) return <Loading />;
  if (!box) return <EmptyState title={t('common.boxUnavailable')} icon="lock-closed-outline" />;
  const isOwner = box.my_role === 'owner';

  return (
    <Screen scroll>
      <AppText variant="section">{box.name}</AppText>
      {isOwner ? (
        <Card style={styles.form}>
          <AppText variant="bodyStrong">{t('boxes.share.title')}</AppText>
          <Input
            testID="share-email-input"
            label={t('boxes.share.email')}
            placeholder={t('boxes.share.emailPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AppText variant="label" muted>
            {t('boxes.share.whatCanDo')}
          </AppText>
          <View style={styles.row}>
            <ChoiceChip
              testID="share-role-viewer"
              label={t('roles.viewer')}
              selected={role === 'viewer'}
              onPress={() => setRole('viewer')}
            />
            <ChoiceChip
              testID="share-role-editor"
              label={t('roles.editor')}
              selected={role === 'editor'}
              onPress={() => setRole('editor')}
            />
          </View>
          <ErrorText testID="share-error">{error}</ErrorText>
          {notice ? (
            <AppText testID="share-success" variant="secondary" color={colors.success}>
              {notice}
            </AppText>
          ) : null}
          <Button testID="share-submit" title={t('boxes.share.submit')} icon="person-add-outline" loading={busy} onPress={submit} />
        </Card>
      ) : (
        <>
          <AppText muted>{t('boxes.share.ownerOnly')}</AppText>
          <ErrorText testID="share-error">{error}</ErrorText>
        </>
      )}

      <AppText variant="section" style={styles.section}>
        {t('boxes.share.whoSees')}
      </AppText>
      <Card testID="share-owner">
        <AppText variant="bodyStrong">{box.owner_email}</AppText>
        <RoleBadge role="owner" />
      </Card>
      {members.length === 0 ? (
        <AppText testID="share-empty" muted>
          {t('boxes.share.onlyYou')}
        </AppText>
      ) : (
        members.map((m) => {
          const canRevoke = isOwner || m.user_id === me;
          return (
            <Card key={m.user_id} testID={`share-row-${m.user_id}`}>
              <View style={styles.memberRow}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{m.display_name || m.email}</AppText>
                  {m.display_name ? (
                    <AppText variant="secondary" muted>
                      {m.email}
                    </AppText>
                  ) : null}
                  <RoleBadge role={m.role} />
                </View>
                {canRevoke ? (
                  <Button
                    testID={`revoke-${m.user_id}`}
                    title={m.user_id === me ? t('boxes.share.leave') : t('boxes.share.revoke')}
                    kind="danger"
                    small
                    onPress={() => setToRevoke(m)}
                  />
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      <ConfirmDialog
        visible={!!toRevoke}
        title={toRevoke?.user_id === me ? t('boxes.share.leaveTitle') : t('boxes.share.revokeTitle')}
        message={
          toRevoke?.user_id === me
            ? t('boxes.share.leaveMessage')
            : t('boxes.share.revokeMessage', { email: toRevoke?.email ?? '' })
        }
        confirmLabel={toRevoke?.user_id === me ? t('boxes.share.leave') : t('boxes.share.revoke')}
        destructive
        loading={busy}
        onConfirm={revoke}
        onCancel={() => setToRevoke(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  form: { gap: space.md },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  section: { marginTop: space.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
