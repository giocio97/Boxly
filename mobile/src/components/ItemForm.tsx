import type { InsertItem, ItemType, Season } from '@shared/types';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInput } from 'react-native';

import { cleanAttributes, DEFAULT_ITEM_TYPE, isItemType, typeHasField } from '@/lib/itemTypes';
import { pickFromLibrary, takePhoto, type PickedPhoto, type PickResult } from '@/lib/photos';
import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Input } from './Input';
import { ItemTypePicker } from './ItemTypePicker';
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
  const { t } = useTranslation();
  const [type, setType] = useState<ItemType>(isItemType(initial?.item_type) ? initial.item_type : DEFAULT_ITEM_TYPE);
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [size, setSize] = useState(initial?.size ?? '');
  const [season, setSeason] = useState<Season | null>(initial?.season ?? null);
  const [author, setAuthor] = useState(initial?.attributes?.author ?? '');
  const [model, setModel] = useState(initial?.attributes?.model ?? '');
  const [serial, setSerial] = useState(initial?.attributes?.serial ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const categoryRef = useRef<TextInput>(null);
  const brandRef = useRef<TextInput>(null);
  const colorRef = useRef<TextInput>(null);
  const sizeRef = useRef<TextInput>(null);
  const modelRef = useRef<TextInput>(null);
  const serialRef = useRef<TextInput>(null);

  const hasSize = typeHasField(type, 'size');
  const hasSeason = typeHasField(type, 'season');
  const hasAuthor = typeHasField(type, 'author');
  const hasModel = typeHasField(type, 'model');
  const hasSerial = typeHasField(type, 'serial');

  function handlePick(res: PickResult) {
    if ('photo' in res) {
      setPhoto(res.photo);
      setError(null);
    } else if ('error' in res) setError(res.error);
  }

  async function submit() {
    const n = name.trim();
    if (!n) {
      setError(t('items.form.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    const clean = (s: string | null | undefined) => (s ?? '').trim() || null;
    // i campi che il tipo scelto non prevede si salvano vuoti (CONTRACT v2.2)
    const err = await onSubmit(
      {
        name: n,
        item_type: type,
        attributes: cleanAttributes(type, { author, model, serial }),
        brand: clean(brand),
        color: clean(color),
        category: clean(category),
        size: hasSize ? clean(size) : null,
        season: hasSeason ? season : null,
        notes: clean(notes),
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
            {t('items.form.photoHint')}
          </AppText>
        )}
      </View>
      <View style={styles.row}>
        <Button
          testID="item-photo-camera"
          title={t('items.form.takePhoto')}
          icon="camera-outline"
          kind="secondary"
          small
          style={styles.flex}
          onPress={async () => handlePick(await takePhoto())}
        />
        <Button
          testID="item-photo-library"
          title={t('items.form.fromLibrary')}
          icon="images-outline"
          kind="secondary"
          small
          style={styles.flex}
          onPress={async () => handlePick(await pickFromLibrary())}
        />
      </View>
      <ItemTypePicker label={t('items.form.type')} testIDPrefix="item-type" value={type} onChange={setType} />
      <Input testID="item-name-input" nextRef={categoryRef} label={t('items.form.name')} placeholder={t('items.form.namePlaceholder')} value={name} onChangeText={setName} maxLength={120} />
      {hasAuthor ? (
        <Input testID="item-author-input" label={t('items.form.author')} placeholder={t('items.form.authorPlaceholder')} value={author} onChangeText={setAuthor} />
      ) : null}
      {hasModel ? (
        <Input testID="item-model-input" nextRef={hasSerial ? serialRef : undefined} ref={modelRef} label={t('items.form.model')} placeholder={t('items.form.modelPlaceholder')} value={model} onChangeText={setModel} />
      ) : null}
      {hasSerial ? (
        <Input testID="item-serial-input" ref={serialRef} autoCapitalize="characters" autoCorrect={false} label={t('items.form.serial')} placeholder={t('items.form.serialPlaceholder')} value={serial} onChangeText={setSerial} />
      ) : null}
      <Input ref={categoryRef} testID="item-category-input" nextRef={brandRef} label={t('items.form.category')} placeholder={t('items.form.categoryPlaceholder')} value={category ?? ''} onChangeText={setCategory} />
      <Input ref={brandRef} testID="item-brand-input" nextRef={colorRef} label={t('items.form.brand')} placeholder={t('items.form.brandPlaceholder')} value={brand ?? ''} onChangeText={setBrand} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Input
            ref={colorRef}
            testID="item-color-input"
            nextRef={hasSize ? sizeRef : undefined}
            returnKeyType={hasSize ? undefined : 'done'}
            label={t('items.form.color')}
            placeholder={t('items.form.colorPlaceholder')}
            value={color ?? ''}
            onChangeText={setColor}
          />
        </View>
        {hasSize ? (
          <View style={styles.flex}>
            <Input ref={sizeRef} testID="item-size-input" returnKeyType="done" label={t('items.form.size')} placeholder={t('items.form.sizePlaceholder')} value={size ?? ''} onChangeText={setSize} />
          </View>
        ) : null}
      </View>
      {hasSeason ? <SeasonPicker value={season} onChange={setSeason} testIDPrefix="item-season" /> : null}
      <Input testID="item-notes-input" label={t('items.form.notes')} placeholder={t('items.form.notesPlaceholder')} value={notes ?? ''} onChangeText={setNotes} multiline />
      <ErrorText testID="form-error">{error}</ErrorText>
      {onCancel ? <Button testID="item-cancel" title={t('common.cancel')} kind="ghost" onPress={onCancel} /> : null}
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
