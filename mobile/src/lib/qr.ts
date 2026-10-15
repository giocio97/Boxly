import type { BoxQrValue } from '@shared/types';

export const QR_PREFIX = 'boxly://box/';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function boxQrValue(boxId: string): BoxQrValue {
  return `${QR_PREFIX}${boxId}` as BoxQrValue;
}

/** Restituisce l'id della scatola se il QR è di Boxly, altrimenti null. */
export function parseBoxQr(data: string | null | undefined): string | null {
  if (!data) return null;
  const value = data.trim();
  if (!value.startsWith(QR_PREFIX)) return null;
  const id = value.slice(QR_PREFIX.length).replace(/\/$/, '');
  return UUID_RE.test(id) ? id.toLowerCase() : null;
}
