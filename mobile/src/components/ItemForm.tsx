import type { InsertItem, Season } from '@shared/types';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { pickFromLibrary, takePhoto, type PickedPhoto, type PickResult } from '@/lib/photos';
import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Input } from './Input';
import { ErrorText, Screen } from './Screen';
import { SeasonPicker } from './SeasonPicker';

export type ItemFields = Omit<InsertItem, 'box_id' | 'photo_path'>;

export interface ItemFormProps {
  initial?: Partial<ItemFields>;
  /** URL (firmato) della foto già salvata, se presente */
  initialPhotoUrl?: string | null;
  submitLabel: string;
  /** Restituisce un messaggio d'errore o null se tutto ok. */
  onSubmit: (values: ItemFields, photo: PickedPhoto | null) => Promise<string | null>;
  onCancel?: () => void;
}

export function ItemForm({ initial, initialPhotoUrl, submitLabel, onSubmit, onCancel }: ItemFormProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [size, setSize] = useState(initial?.size ?? '');
  const [season, setSeason] = useState<Season | null>(initial?.season ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const categoryRef = useRef<TextInput>(null);
  const brandRef = useRef<TextInput>(null);
  const colorRef = useRef<TextInput>(null);
  const sizeRef = useRef<TextInput>(null);

  function handlePick(res: PickResult) {
    if ('photo' in res) {
      setPhoto(res.photo);
      setError(null);
    } else if ('error' in res) setError(res.error);
  }

  async function submit() {
    const n = name.trim();
    if (!n) {
      setError('Dai un nome all’oggetto.');
      return;
    }
    setBusy(true);
    setError(null);
    const t = (s: string | null | undefined) => (s ?? '').trim() || null;
    const err = await onSubmit(
      {
        name: n,
        brand: t(brand),
        color: t(color),
        category: t(category),
        size: t(size),
        season,
        notes: t(notes),
      },
      photo,
    );
    setBusy(false);
    if (err) setError(err);
  }

  const previewUri = photo?.uri ?? initialPhotoUrl ?? null;

  return (
    <Screen scroll footer={<Button testID="item-save" title={submitLabel} onPress={submit} loading={busy} />}>
      <View style={[styles.photoBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {previewUri ? (
          <Image testID="item-photo-preview" source={{ uri: previewUri }} style={styles.preview} contentFit="cover" />
        ) : (
          <AppText muted style={styles.center}>
            Aggiungi una foto: ti aiuta a riconoscerlo al volo.
          </AppText>
        )}
      </View>
      <View style={styles.row}>
        <Button
          testID="item-photo-camera"
          title="Scatta"
          icon="camera-outline"
          kind="secondary"
          small
          style={styles.flex}
          onPress={async () => handlePick(await takePhoto())}
        />
        <Button
          testID="item-photo-library"
          title="Dalla libreria"
          icon="images-outline"
          kind="secondary"
          small
          style={styles.flex}
          onPress={async () => handlePick(await pickFromLibrary())}
        />
      </View>
      <Input testID="item-name-input" nextRef={categoryRef} label="Nome" placeholder="Es. Maglione blu" value={name} onChangeText={setName} maxLength={120} />
      <Input ref={categoryRef} testID="item-category-input" nextRef={brandRef} label="Categoria" placeholder="Es. Maglieria" value={category ?? ''} onChangeText={setCategory} />
      <Input ref={brandRef} testID="item-brand-input" nextRef={colorRef} label="Marca" placeholder="Es. Uniqlo" value={brand ?? ''} onChangeText={setBrand} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Input ref={colorRef} testID="item-color-input" nextRef={sizeRef} label="Colore" placeholder="Es. Blu" value={color ?? ''} onChangeText={setColor} />
        </View>
        <View style={styles.flex}>
          <Input ref={sizeRef} testID="item-size-input" returnKeyType="done" label="Taglia" placeholder="Es. M" value={size ?? ''} onChangeText={setSize} />
        </View>
      </View>
      <SeasonPicker value={season} onChange={setSeason} testIDPrefix="item-season" />
      <Input testID="item-notes-input" label="Note" placeholder="Qualcosa da ricordare?" value={notes ?? ''} onChangeText={setNotes} multiline />
      <ErrorText testID="form-error">{error}</ErrorText>
      {onCancel ? <Button testID="item-cancel" title="Annulla" kind="ghost" onPress={onCancel} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoBox: {
    height: 200,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', height: '100%' },
  center: { textAlign: 'center', padding: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
