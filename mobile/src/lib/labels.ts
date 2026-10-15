import type { BoxRole, ItemEventAction, Season, ShareRole } from '@shared/types';

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter', 'all'];

export const seasonLabel: Record<Season, string> = {
  spring: 'Primavera',
  summer: 'Estate',
  autumn: 'Autunno',
  winter: 'Inverno',
  all: "Tutto l'anno",
};

export const roleLabel: Record<BoxRole, string> = {
  owner: 'Proprietario',
  editor: 'Può modificare',
  viewer: 'Solo lettura',
};

export const shareRoleLabel: Record<ShareRole, string> = {
  viewer: 'Solo lettura',
  editor: 'Può modificare',
};

export const eventLabel: Record<ItemEventAction, string> = {
  added: 'aggiunto',
  updated: 'modificato',
  moved: 'spostato',
  removed: 'tolto',
};

export function canEdit(role: BoxRole | null | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
