import type { BoxOverview } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { BoxCard } from '@/components/BoxCard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorText, Loading } from '@/components/Screen';
import { listBoxes } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { space, useTheme } from '@/theme';

export default function BoxesScreen() {
  const { colors } = useTheme();
  const [boxes, setBoxes] = useState<BoxOverview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await listBoxes();
    if (res.error) setError(errorMessage(res.error, 'Non riesco a caricare le scatole. Riprova.'));
    else {
      setError(null);
      setBoxes(res.data);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!boxes && !error) return <Loading />;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        testID="box-list"
        data={boxes ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button
              testID="new-box-button"
              title="Nuova scatola"
              icon="add"
              onPress={() => router.push('/box/new')}
            />
            <ErrorText>{error}</ErrorText>
          </View>
        }
        ListEmptyComponent={
          boxes ? (
            <EmptyState
              testID="empty-boxes"
              title="Ancora nessuna scatola."
              message="Creane una e inizia a riempirla."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <BoxCard box={item} onPress={() => router.push({ pathname: '/box/[id]', params: { id: item.id } })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.xs },
});
