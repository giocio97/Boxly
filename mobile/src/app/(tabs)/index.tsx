import type { BoxOverview } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { BoxCard } from '@/components/BoxCard';
import { EmptyState } from '@/components/EmptyState';
import { FAB_SPACE, FloatingActionButton } from '@/components/FloatingActionButton';
import { HomeSearchBar } from '@/components/HomeSearchBar';
import { ErrorText, Loading } from '@/components/Screen';
import { listBoxes } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { space, useTheme } from '@/theme';

export default function BoxesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [boxes, setBoxes] = useState<BoxOverview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await listBoxes();
    if (res.error) setError(errorMessage(res.error, t('boxes.list.loadError')));
    else {
      setError(null);
      setBoxes(res.data);
    }
  }, [t]);

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
            <HomeSearchBar placeholder={t('boxes.list.searchPlaceholder')} onPress={() => router.push('/search')} />
            <ErrorText>{error}</ErrorText>
          </View>
        }
        ListEmptyComponent={
          boxes ? (
            <EmptyState testID="empty-boxes" title={t('boxes.empty.title')} message={t('boxes.empty.message')} />
          ) : null
        }
        renderItem={({ item }) => (
          <BoxCard box={item} onPress={() => router.push({ pathname: '/box/[id]', params: { id: item.id } })} />
        )}
      />
      <FloatingActionButton
        testID="new-box-button"
        title={t('boxes.list.newBox')}
        icon="add"
        onPress={() => router.push('/box/new')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.lg + FAB_SPACE, gap: space.md, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.xs },
});
