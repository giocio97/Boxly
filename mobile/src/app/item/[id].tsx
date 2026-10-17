import type { BoxOverview, Item } from '@shared/types';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { RoleBadge, SeasonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ItemForm } from '@/components/ItemForm';
import { ErrorText, Loading, Screen } from '@/components/Screen';
import { deleteItem, getBox, getItem, listBoxes, moveItem, updateItem } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { itemTypeIcon, typeHasField } from '@/lib/itemTypes';
import { canEdit, formatDateTime } from '@/lib/labels';
import { goBackOrHome } from '@/lib/nav';
import { removePhotos, uploadItemPhoto, useSignedUrl } from '@/lib/photos';
import { radius, space, useTheme } from '@/theme';

type Mode = 'view' | 'edit' | 'move';

function Field({ label, value, testID }: { label: string; value: string | null; testID?: string }) {
  if (!value) return null;
  return (
    <View testID={testID} style={styles.field}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [box, setBox] = useState<BoxOverview | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [targets, setTargets] = useState<BoxOverview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const photoUrl = useSignedUrl(item?.photo_path);

  const load = useCallback(async () => {
    const res = await getItem(id);
    if (res.error || !res.data) {
      setItem(null);
      if (res.error) setError(errorMessage(res.error));
      return;
    }
    setItem(res.data);
    const b = await getBox(res.data.box_id);
    setBox(b.data ?? null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function openMove() {
    setError(null);
    const res = await listBoxes();
    if (res.error) {
      setError(errorMessage(res.error));
      return;
    }
    setTargets(res.data.filter((b) => b.id !== item?.box_id && canEdit(b.my_role)));
    setMode('move');
  }

  async function doMove(target: BoxOverview) {
    if (!item) return;
    setBusy(true);
    const res = await moveItem(item.id, target.id);
    setBusy(false);
    if (res.error) {
      setError(errorMessage(res.error, t('items.detail.moveError')));
      return;
    }
    setMode('view');
    await load();
  }

  async function doDelete() {
    if (!item) return;
    setBusy(true);
    const res = await deleteItem(item.id);
    setBusy(false);
    setConfirmDelete(false);
    if (res.error) {
      setError(errorMessage(res.error, t('items.detail.deleteError')));
      return;
    }
    removePhotos([item.photo_path]).catch(() => {});
    goBackOrHome();
  }

  if (item === undefined) return <Loading />;
  if (!item) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="help-circle-outline"
          title={t('items.detail.notFound')}
          message={error ?? t('items.detail.notFoundMessage')}
        />
      </View>
    );
  }

  const editable = canEdit(box?.my_role);
  const type = item.item_type ?? 'other';
  const attrs = item.attributes ?? {};

  if (mode === 'edit' && editable) {
    return (
      <>
        <Stack.Screen options={{ title: t('nav.editItem') }} />
        <ItemForm
          initial={item}
          initialPhotoUrl={photoUrl}
          submitLabel={t('common.save')}
          onCancel={() => setMode('view')}
          onSubmit={async (values, photo) => {
            const res = await updateItem(item.id, values);
            if (res.error) return errorMessage(res.error, t('boxes.form.saveError'));
            if (photo) {
              try {
                const path = await uploadItemPhoto(item.id, photo);
                const upd = await updateItem(item.id, { photo_path: path });
                if (upd.error) throw upd.error;
                if (item.photo_path) removePhotos([item.photo_path]).catch(() => {});
              } catch {
                return t('items.form.photoErrorEdit');
              }
            }
            setMode('view');
            await load();
            return null;
          }}
        />
      </>
    );
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: item.name }} />
      {photoUrl ? (
        <Image testID="item-photo" source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
      ) : null}
      <AppText testID="item-title" variant="title">
        {item.name}
      </AppText>
      <View style={styles.badges}>
        <View
          testID="item-type"
          accessible
          accessibilityLabel={t(`itemTypes.${type}`)}
          style={[styles.typeBadge, { borderColor: colors.accent, backgroundColor: colors.accent + '22' }]}>
          <Ionicons name={itemTypeIcon(type)} size={14} color={colors.accent} />
          <AppText variant="label" color={colors.accent}>
            {t(`itemTypes.${type}`)}
          </AppText>
        </View>
        <SeasonBadge season={item.season} />
        {box ? <RoleBadge role={box.my_role} /> : null}
      </View>
      {box ? (
        <Card
          testID="item-box-link"
          onPress={() => router.push({ pathname: '/box/[id]', params: { id: box.id } })}
          accessibilityLabel={t('items.detail.boxA11y', { name: box.name })}>
          <AppText variant="label" muted>
            {t('items.detail.foundIn')}
          </AppText>
          <AppText testID="item-box-name" variant="bodyStrong">
            {box.name}
          </AppText>
          {box.location ? <AppText muted>{box.location}</AppText> : null}
        </Card>
      ) : null}
      <View style={styles.fields}>
        {typeHasField(type, 'author') ? <Field testID="item-author" label={t('items.form.author')} value={attrs.author ?? null} /> : null}
        {typeHasField(type, 'model') ? <Field testID="item-model" label={t('items.form.model')} value={attrs.model ?? null} /> : null}
        {typeHasField(type, 'serial') ? <Field testID="item-serial" label={t('items.form.serial')} value={attrs.serial ?? null} /> : null}
        <Field label={t('items.form.category')} value={item.category} />
        <Field label={t('items.form.brand')} value={item.brand} />
        <Field label={t('items.form.color')} value={item.color} />
        {typeHasField(type, 'size') ? <Field label={t('items.form.size')} value={item.size} /> : null}
        <Field label={t('items.form.notes')} value={item.notes} />
        <Field label={t('items.detail.updated')} value={formatDateTime(item.updated_at, i18n.language)} />
      </View>
      <ErrorText testID="item-error">{error}</ErrorText>

      {editable && mode === 'view' ? (
        <View style={styles.actions}>
          <Button testID="item-edit-button" title={t('common.edit')} icon="create-outline" kind="secondary" onPress={() => setMode('edit')} />
          <Button testID="item-move-button" title={t('items.detail.move')} icon="swap-horizontal" kind="secondary" onPress={openMove} />
          <Button testID="item-delete-button" title={t('common.delete')} icon="trash-outline" kind="danger" onPress={() => setConfirmDelete(true)} />
        </View>
      ) : null}

      {editable && mode === 'move' ? (
        <View style={styles.actions}>
          <AppText variant="section">{t('items.detail.moveWhere')}</AppText>
          {targets.length === 0 ? (
            <AppText muted>{t('items.detail.noTargets')}</AppText>
          ) : (
            targets.map((t) => (
              <Card
                key={t.id}
                testID={`move-target-${t.id}`}
                onPress={busy ? undefined : () => doMove(t)}
                accessibilityLabel={t.name}
                style={styles.target}>
                <AppText variant="bodyStrong">{t.name}</AppText>
                {t.location ? <AppText variant="secondary" muted>{t.location}</AppText> : null}
              </Card>
            ))
          )}
          <Button title={t('common.cancel')} kind="ghost" onPress={() => setMode('view')} testID="move-cancel" />
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmDelete}
        title={t('items.detail.deleteTitle')}
        message={t('items.detail.deleteMessage', { name: item.name })}
        confirmLabel={t('common.delete')}
        destructive
        loading={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.card },
  badges: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 2,
  },
  fields: { gap: space.md },
  field: { gap: 2 },
  actions: { gap: space.md, marginTop: space.md },
  target: { paddingVertical: space.md },
});
