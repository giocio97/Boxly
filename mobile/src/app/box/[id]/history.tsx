import Ionicons from '@expo/vector-icons/Ionicons';
import type { ItemEvent, ItemEventAction } from '@shared/types';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorText, Loading } from '@/components/Screen';
import { listBoxes, listEvents, listProfiles } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/labels';
import { radius, space, useTheme } from '@/theme';

const icons: Record<ItemEventAction, 'add-circle' | 'create' | 'swap-horizontal' | 'remove-circle'> = {
  added: 'add-circle',
  updated: 'create',
  moved: 'swap-horizontal',
  removed: 'remove-circle',
};

export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<ItemEvent[] | null>(null);
  const [boxNames, setBoxNames] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ev, boxes] = await Promise.all([listEvents(id), listBoxes()]);
    if (ev.error) {
      setError(errorMessage(ev.error, t('boxes.history.loadError')));
      setEvents([]);
      return;
    }
    setEvents(ev.data);
    setBoxNames(Object.fromEntries((boxes.data ?? []).map((b) => [b.id, b.name])));
    const actorIds = [...new Set(ev.data.map((e) => e.actor_id).filter((a): a is string => !!a))];
    const prof = await listProfiles(actorIds);
    setPeople(Object.fromEntries((prof.data ?? []).map((p) => [p.id, p.display_name || p.email])));
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!events) return <Loading />;

  function describe(e: ItemEvent): string {
    if (e.action === 'moved') {
      if (e.box_id === id) {
        const from = e.from_box_id ? boxNames[e.from_box_id] : null;
        return from ? t('boxes.history.arrivedFrom', { box: from }) : t('boxes.history.arrivedFromOther');
      }
      const to = boxNames[e.box_id];
      return to ? t('boxes.history.movedTo', { box: to }) : t('boxes.history.movedToOther');
    }
    return t(`events.${e.action}`);
  }

  function actor(e: ItemEvent): string {
    if (!e.actor_id) return '';
    if (e.actor_id === session?.user.id) return t('boxes.history.byYou');
    return people[e.actor_id] ? t('boxes.history.byPerson', { name: people[e.actor_id] }) : '';
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        testID="history-list"
        data={events}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<ErrorText>{error}</ErrorText>}
        ListEmptyComponent={
          <EmptyState testID="history-empty" icon="time-outline" title={t('boxes.history.emptyTitle')} message={t('boxes.history.emptyMessage')} />
        }
        renderItem={({ item: e }) => (
          <View
            testID={`history-row-${e.id}`}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons
              name={icons[e.action]}
              size={24}
              color={e.action === 'removed' ? colors.danger : e.action === 'added' ? colors.success : colors.accent}
            />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{e.item_name}</AppText>
              <AppText variant="secondary" muted>
                {[describe(e), actor(e)].filter(Boolean).join(' ')}
              </AppText>
              <AppText variant="label" muted>
                {formatDateTime(e.created_at, i18n.language)}
              </AppText>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
});
