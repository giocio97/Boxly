import { router } from 'expo-router';

import { BoxForm } from '@/components/BoxForm';
import { createBox } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function NewBoxScreen() {
  return (
    <BoxForm
      submitLabel="Crea scatola"
      onSubmit={async (values) => {
        const res = await createBox(values);
        if (res.error) return errorMessage(res.error, 'Non riesco a creare la scatola. Riprova.');
        router.replace({ pathname: '/box/[id]', params: { id: res.data.id } });
        return null;
      }}
    />
  );
}
