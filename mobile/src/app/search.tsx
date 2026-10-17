import type { ItemSearchResult, ItemType } from '@shared/types';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { ItemRow } from '@/components/ItemRow';
import { ErrorText } from '@/components/Screen';
import { ChoiceChip } from '@/components/SeasonPicker';
import { searchItems } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { ITEM_TYPES } from '@/lib/itemTypes';
import { signedUrls } from '@/lib/photos';
import { space, useTheme } from '@/theme';

const DEBOUNCE_MS = 300;

type Found = { key: string; items: ItemSearchResult[]; error: string | null };

export default function SearchScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ItemType | null>(null);
  // risultati legati a query+tipo che li hanno prodotti: niente setState sincroni nell'effect
  const [found, setFound] = useState<Found | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const seq = useRef(0);
  const q = query.trim();
  const active = !!q || !!type;
  const key = `${type ?? ''}|${q}`;

  useEffect(() => {
    if (!q && !type) return;
    const mySeq = ++seq.current;
    const timer = setTimeout(async () => {
      const res = await searchItems(q, type);
      if (mySeq !== seq.current) return; // risposta superata da una ricerca più recente
      if (res.error) {
        setFound({ key, items: [], error: errorMessage(res.error, t('search.error')) });
        return;
      }
      setFound({ key, items: res.data, error: null });
      signedUrls(res.data.map((r) => r.photo_path)).then(setPhotos);
    }, q ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [q, type, key, t]);

  const current = active && found?.key === key ? found : null;
  const results = active ? (current?.items ?? null) : null;
  const loading = active && !current;
  const error = current?.error ?? null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Input
          testID="search-input"
          autoFocus
          placeholder={t('search.placeholder')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}>
          <ChoiceChip testID="search-type-all" label={t('search.all')} selected={type === null} onPress={() => setType(null)} />
          {ITEM_TYPES.map((def) => (
            <ChoiceChip
              key={def.key}
              testID={`search-type-${def.key}`}
              icon={def.icon}
              label={t(`itemTypes.${def.key}`)}
              selected={type === def.key}
              onPress={() => setType(type === def.key ? null : def.key)}
            />
          ))}
        </ScrollView>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        <ErrorText>{error}</ErrorText>
      </View>
      <FlatList
        testID="search-results"
        data={results ?? []}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          !active ? (
            <EmptyState icon="search-outline" title={t('search.startTitle')} message={t('search.startMessage')} />
          ) : results ? (
            <EmptyState testID="search-empty" icon="sad-outline" title={t('search.emptyTitle')} message={t('search.emptyMessage')} />
          ) : null
        }
        renderItem={({ item }) => (
          <ItemRow
            testID={`search-result-${item.id}`}
            item={item}
            photoUrl={item.photo_path ? photos[item.photo_path] : null}
            subtitle={[t('items.inBox', { box: item.box_name }), item.box_location].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: space.lg, paddingBottom: 0, gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm, paddingRight: space.lg },
  content: { padding: space.lg, gap: space.md, flexGrow: 1 },
});
