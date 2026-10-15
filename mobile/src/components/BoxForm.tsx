import type { InsertBox, Season } from '@shared/types';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { Button } from './Button';
import { Input } from './Input';
import { ErrorText, Screen } from './Screen';
import { SeasonPicker } from './SeasonPicker';

export interface BoxFormProps {
  initial?: Partial<InsertBox>;
  submitLabel: string;
  onSubmit: (values: InsertBox) => Promise<string | null>;
}

/** Form crea/modifica scatola. `onSubmit` restituisce un messaggio d'errore o null. */
export function BoxForm({ initial, submitLabel, onSubmit }: BoxFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [season, setSeason] = useState<Season | null>(initial?.season ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locationRef = useRef<TextInput>(null);

  async function submit() {
    const n = name.trim();
    if (!n) {
      setError('Dai un nome alla scatola.');
      return;
    }
    if (n.length > 80) {
      setError('Il nome può avere al massimo 80 caratteri.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit({
      name: n,
      location: location.trim() || null,
      season,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Screen scroll footer={<Button testID="box-save" title={submitLabel} onPress={submit} loading={busy} />}>
      <Input
        testID="box-name-input"
        nextRef={locationRef}
        label="Nome"
        placeholder="Es. Inverno 2025"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Input
        ref={locationRef}
        testID="box-location-input"
        returnKeyType="done"
        label="Dove si trova"
        placeholder="Es. Cantina, armadio camera"
        value={location}
        onChangeText={setLocation}
      />
      <SeasonPicker value={season} onChange={setSeason} testIDPrefix="box-season" />
      <Input
        testID="box-notes-input"
        label="Note"
        placeholder="Qualcosa da ricordare?"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <ErrorText testID="form-error">{error}</ErrorText>
    </Screen>
  );
}
