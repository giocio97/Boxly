import type { BoxOverview } from '@shared/types';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ItemForm } from '@/components/ItemForm';
import { Loading } from '@/components/Screen';
import { createItem, getBox, updateItem } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { canEdit } from '@/lib/labels';
import { uploadItemPhoto } from '@/lib/photos';

export default function NewItemScreen() {
  const { boxId } = useLocalSearchParams<{ boxId: string }>();
  const { t } = useTranslation();
  const [box, setBox] = useState<BoxOverview | null | undefined>(boxId ? undefined : null);
  // se la foto non si carica, l'oggetto è già salvato: al nuovo tentativo si ricarica solo la foto
  const createdId = useRef<string | null>(null);

  useEffect(() => {
    if (!boxId) return;
    getBox(boxId).then((res) => setBox(res.data ?? null));
  }, [boxId]);

  if (box === undefined) return <Loading />;
  if (!box || !canEdit(box.my_role)) {
    return <EmptyState title={t('items.form.cannotAdd')} icon="lock-closed-outline" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: t('items.form.titleIn', { box: box.name }) }} />
      <ItemForm
        initial={{ item_type: box.default_item_type ?? 'other' }}
        submitLabel={t('items.form.submitNew')}
        onSubmit={async (values, photo) => {
          let itemId = createdId.current;
          if (!itemId) {
            const res = await createItem({ ...values, box_id: box.id });
            if (res.error) return errorMessage(res.error, t('items.form.saveError'));
            itemId = res.data.id;
            createdId.current = itemId;
          } else {
            await updateItem(itemId, values);
          }
          if (photo) {
            try {
              const path = await uploadItemPhoto(itemId, photo);
              const upd = await updateItem(itemId, { photo_path: path });
              if (upd.error) throw upd.error;
            } catch {
              return t('items.form.photoErrorNew');
            }
          }
          router.back();
          return null;
        }}
      />
    </>
  );
}
