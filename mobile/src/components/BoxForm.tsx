import type { InsertBox, ItemType, Season } from '@shared/types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';

import { Button } from './Button';
import { Input } from './Input';
import { ItemTypePicker } from './ItemTypePicker';
import { ErrorText, Screen } from './Screen';
import { SeasonPicker } from './SeasonPicker';

export interface BoxFormProps {
  initial?: Partial<InsertBox>;
  submitLabel: string;
  onSubmit: (values: InsertBox) => Promise<string | null>;
}

/** Form crea/modifica scatola. `onSubmit` restituisce un messaggio d'errore o null. */
export function BoxForm({ initial, submitLabel, onSubmit }: BoxFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [season, setSeason] = useState<Season | null>(initial?.season ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [defaultType, setDefaultType] = useState<ItemType | null>(initial?.default_item_type ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locationRef = useRef<TextInput>(null);

  async function submit() {
    const n = name.trim();
    if (!n) {
      setError(t('boxes.form.nameRequired'));
      return;
    }
    if (n.length > 80) {
      setError(t('boxes.form.nameTooLong'));
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit({
      name: n,
      location: location.trim() || null,
      season,
      notes: notes.trim() || null,
      default_item_type: defaultType,
    });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Screen scroll footer={<Button testID="box-save" title={submitLabel} onPress={submit} loading={busy} />}>
      <Input
        testID="box-name-input"
        nextRef={locationRef}
        label={t('boxes.form.name')}
        placeholder={t('boxes.form.namePlaceholder')}
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Input
        ref={locationRef}
        testID="box-location-input"
        returnKeyType="done"
        label={t('boxes.form.location')}
        placeholder={t('boxes.form.locationPlaceholder')}
        value={location}
        onChangeText={setLocation}
      />
      <ItemTypePicker
        label={t('boxes.form.defaultType')}
        testIDPrefix="box-type"
        value={defaultType}
        onChange={setDefaultType}
        noneLabel={t('boxes.form.defaultTypeNone')}
        noneTestID="box-type-none"
      />
      <SeasonPicker value={season} onChange={setSeason} testIDPrefix="box-season" />
      <Input
        testID="box-notes-input"
        label={t('boxes.form.notes')}
        placeholder={t('boxes.form.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <ErrorText testID="form-error">{error}</ErrorText>
    </Screen>
  );
}
