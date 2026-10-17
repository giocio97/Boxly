import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BoxForm } from '@/components/BoxForm';
import { createBox } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function NewBoxScreen() {
  const { t } = useTranslation();
  return (
    <BoxForm
      submitLabel={t('boxes.form.create')}
      onSubmit={async (values) => {
        const res = await createBox(values);
        if (res.error) return errorMessage(res.error, t('boxes.form.createError'));
        router.replace({ pathname: '/box/[id]', params: { id: res.data.id } });
        return null;
      }}
    />
  );
}
