import type { BoxOverview } from '@shared/types';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { BoxForm } from '@/components/BoxForm';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Screen';
import { getBox, updateBox } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { canEdit } from '@/lib/labels';

export default function EditBoxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [box, setBox] = useState<BoxOverview | null | undefined>(undefined);

  useEffect(() => {
    getBox(id).then((res) => setBox(res.data ?? null));
  }, [id]);

  if (box === undefined) return <Loading />;
  if (!box || !canEdit(box.my_role)) {
    return <EmptyState title="Non puoi modificare questa scatola." icon="lock-closed-outline" />;
  }

  return (
    <BoxForm
      initial={box}
      submitLabel="Salva modifiche"
      onSubmit={async (values) => {
        const res = await updateBox(id, values);
        if (res.error) return errorMessage(res.error, 'Non riesco a salvare. Riprova.');
        router.back();
        return null;
      }}
    />
  );
}
