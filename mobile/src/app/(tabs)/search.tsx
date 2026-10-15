import type { ItemSearchResult } from '@shared/types';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { ItemRow } from '@/components/ItemRow';
import { ErrorText } from '@/components/Screen';
import { searchItems } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { signedUrls } from '@/lib/photos';
import { space, useTheme } from '@/theme';

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  // risultati legati alla query che li ha prodotti: niente setState sincroni nell'effect
  const [found, setFound] = useState<{ query: string; items: ItemSearchResult[]; error: string | null } | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const seq = useRef(0);
  const q = query.trim();

  useEffect(() => {
    if (!q) return;
    const mySeq = ++seq.current;
    const t = setTimeout(async () => {
      const res = await searchItems(q);
      if (mySeq !== seq.current) return; // risposta superata da una ricerca più recente
      if (res.error) {
        setFound({ query: q, items: [], error: errorMessage(res.error, 'Non riesco a cercare adesso. Riprova.') });
        return;
      }
      setFound({ query: q, items: res.data, error: null });
      signedUrls(res.data.map((r) => r.photo_path)).then(setPhotos);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  const current = q && found?.query === q ? found : null;
  const results = q ? (current?.items ?? null) : null;
  const loading = !!q && !current;
  const error = current?.error ?? null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Input
          testID="search-input"
          placeholder="Cerca un oggetto: maglione, blu, Uniqlo…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        <ErrorText>{error}</ErrorText>
      </View>
      <FlatList
        testID="search-results"
        data={results ?? []}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          !q ? (
            <EmptyState icon="search-outline" title="Cosa stai cercando?" message="Scrivi nome, marca, colore o categoria: ti dico in che scatola si trova." />
          ) : results ? (
            <EmptyState testID="search-empty" icon="sad-outline" title="Nessun oggetto trovato." message="Prova con un'altra parola." />
          ) : null
        }
        renderItem={({ item }) => (
          <ItemRow
            testID={`search-result-${item.id}`}
            item={item}
            photoUrl={item.photo_path ? photos[item.photo_path] : null}
            subtitle={['In ' + item.box_name, item.box_location].filter(Boolean).join(' · ')}
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
  content: { padding: space.lg, gap: space.md, flexGrow: 1 },
});
