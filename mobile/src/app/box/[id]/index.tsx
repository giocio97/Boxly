import type { BoxOverview, Item } from '@shared/types';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { RoleBadge, SeasonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ItemRow } from '@/components/ItemRow';
import { ErrorText, Loading } from '@/components/Screen';
import { deleteBox, getBox, listItems } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { canEdit } from '@/lib/labels';
import { goBackOrHome } from '@/lib/nav';
import { removePhotos, signedUrls } from '@/lib/photos';
import { space, useTheme } from '@/theme';

export default function BoxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [box, setBox] = useState<BoxOverview | null | undefined>(undefined);
  const [items, setItems] = useState<Item[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [b, it] = await Promise.all([getBox(id), listItems(id)]);
    if (b.error) {
      setError(errorMessage(b.error, t('boxes.detail.loadError')));
      setBox((prev) => prev ?? null);
      return;
    }
    setError(null);
    setBox(b.data);
    const list = it.data ?? [];
    setItems(list);
    signedUrls(list.map((i) => i.photo_path)).then(setPhotos);
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function doDelete() {
    setDeleting(true);
    const paths = items.map((i) => i.photo_path);
    const res = await deleteBox(id);
    setDeleting(false);
    setConfirmDelete(false);
    if (res.error) {
      setError(errorMessage(res.error, t('boxes.detail.deleteError')));
      return;
    }
    removePhotos(paths).catch(() => {});
    goBackOrHome();
  }

  if (box === undefined) return <Loading />;
  if (!box) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState
          testID="box-not-found"
          icon="lock-closed-outline"
          title={t('common.boxUnavailable')}
          message={error ?? t('boxes.detail.notFound')}
          action={<Button title={t('boxes.detail.backToBoxes')} kind="secondary" onPress={() => router.replace('/')} />}
        />
      </View>
    );
  }

  const editable = canEdit(box.my_role);
  const isOwner = box.my_role === 'owner';

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: box.name }} />
      <FlatList
        testID="item-list"
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText testID="box-title" variant="title">
              {box.name}
            </AppText>
            {box.location ? <AppText muted>{box.location}</AppText> : null}
            <View style={styles.badges}>
              <RoleBadge role={box.my_role} testID="role-badge" />
              <SeasonBadge season={box.season} />
            </View>
            {box.my_role !== 'owner' ? (
              <AppText variant="secondary" muted>
                {t('boxes.detail.sharedBy', { email: box.owner_email })}
              </AppText>
            ) : null}
            {box.notes ? <AppText variant="secondary">{box.notes}</AppText> : null}

            <View style={styles.actions}>
              <Button
                testID="show-qr-button"
                title={t('boxes.detail.qr')}
                icon="qr-code-outline"
                kind="secondary"
                small
                onPress={() => router.push({ pathname: '/box/[id]/qr', params: { id } })}
              />
              <Button
                testID="share-button"
                title={t('boxes.detail.share')}
                icon="people-outline"
                kind="secondary"
                small
                onPress={() => router.push({ pathname: '/box/[id]/share', params: { id } })}
              />
              <Button
                testID="history-button"
                title={t('boxes.detail.history')}
                icon="time-outline"
                kind="secondary"
                small
                onPress={() => router.push({ pathname: '/box/[id]/history', params: { id } })}
              />
              {editable ? (
                <Button
                  testID="edit-box-button"
                  title={t('common.edit')}
                  icon="create-outline"
                  kind="secondary"
                  small
                  onPress={() => router.push({ pathname: '/box/[id]/edit', params: { id } })}
                />
              ) : null}
              {isOwner ? (
                <Button
                  testID="delete-box-button"
                  title={t('common.delete')}
                  icon="trash-outline"
                  kind="danger"
                  small
                  onPress={() => setConfirmDelete(true)}
                />
              ) : null}
            </View>
            <ErrorText>{error}</ErrorText>
            <View style={styles.sectionRow}>
              <AppText variant="section">
                {t('common.itemCount', { count: items.length })}
              </AppText>
              {editable ? (
                <Button
                  testID="add-item-button"
                  title={t('boxes.detail.addItem')}
                  icon="add"
                  small
                  onPress={() => router.push({ pathname: '/item/new', params: { boxId: id } })}
                />
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            testID="empty-items"
            icon="shirt-outline"
            title={t('boxes.detail.emptyTitle')}
            message={editable ? t('boxes.detail.emptyEditable') : t('boxes.detail.emptyReadonly')}
          />
        }
        renderItem={({ item }) => (
          <ItemRow
            testID={`item-row-${item.id}`}
            item={item}
            photoUrl={item.photo_path ? photos[item.photo_path] : null}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
          />
        )}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title={t('boxes.detail.deleteTitle')}
        message={t('boxes.detail.deleteMessage', { name: box.name })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md, flexGrow: 1 },
  header: { gap: space.sm, marginBottom: space.xs },
  badges: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
  },
});
