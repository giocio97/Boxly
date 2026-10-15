import type { BoxOverview } from '@shared/types';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { ItemForm } from '@/components/ItemForm';
import { Loading } from '@/components/Screen';
import { createItem, getBox, updateItem } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { canEdit } from '@/lib/labels';
import { uploadItemPhoto } from '@/lib/photos';

export default function NewItemScreen() {
  const { boxId } = useLocalSearchParams<{ boxId: string }>();
  const [box, setBox] = useState<BoxOverview | null | undefined>(boxId ? undefined : null);
  // se la foto non si carica, l'oggetto è già salvato: al nuovo tentativo si ricarica solo la foto
  const createdId = useRef<string | null>(null);

  useEffect(() => {
    if (!boxId) return;
    getBox(boxId).then((res) => setBox(res.data ?? null));
  }, [boxId]);

  if (box === undefined) return <Loading />;
  if (!box || !canEdit(box.my_role)) {
    return <EmptyState title="Non puoi aggiungere oggetti a questa scatola." icon="lock-closed-outline" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: `In ${box.name}` }} />
      <ItemForm
        submitLabel="Salva oggetto"
        onSubmit={async (values, photo) => {
          let itemId = createdId.current;
          if (!itemId) {
            const res = await createItem({ ...values, box_id: box.id });
            if (res.error) return errorMessage(res.error, 'Non riesco a salvare l’oggetto. Riprova.');
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
              return 'Oggetto salvato, ma non riesco a caricare la foto. Riprova o torna indietro: l’oggetto resta senza foto.';
            }
          }
          router.back();
          return null;
        }}
      />
    </>
  );
}
