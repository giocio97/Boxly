import type { BoxRole, ItemEventAction, ItemType, Season, ShareRole } from '@shared/types';

import i18n from '@/i18n';
import { ITEM_TYPE_KEYS } from './itemTypes';

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter', 'all'];

/**
 * Mappa chiave → testo tradotto. Ogni lettura chiede la traduzione a i18next, quindi segue la
 * lingua attiva (i componenti si ri-renderizzano al cambio lingua con useTranslation).
 */
function translated<K extends string>(keys: readonly K[], prefix: string): Readonly<Record<K, string>> {
  const out = {} as Record<K, string>;
  for (const k of keys) {
    Object.defineProperty(out, k, { enumerable: true, get: () => i18n.t(`${prefix}.${k}`) });
  }
  return out;
}

export const seasonLabel = translated(SEASONS, 'seasons');
export const roleLabel = translated<BoxRole>(['owner', 'editor', 'viewer'], 'roles');
export const shareRoleLabel = translated<ShareRole>(['viewer', 'editor'], 'roles');
export const eventLabel = translated<ItemEventAction>(['added', 'updated', 'moved', 'removed'], 'events');
export const itemTypeLabel = translated<ItemType>(ITEM_TYPE_KEYS, 'itemTypes');

export function canEdit(role: BoxRole | null | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

/** Data e ora nella lingua attiva (it: 05/01/2025 09:07). */
export function formatDateTime(iso: string, lang: string = i18n.language || 'it'): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${date} ${time}`;
}
