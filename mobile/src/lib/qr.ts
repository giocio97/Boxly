import type { BoxQrValue } from '@shared/types';

/** Prefisso dei QR nuovi (CONTRACT v2.1). */
export const QR_PREFIX = 'stivo://box/';
/** Prefisso delle etichette stampate prima della rinomina: lo scanner le accetta ancora. */
export const LEGACY_QR_PREFIX = 'boxly://box/';
const PREFIXES = [QR_PREFIX, LEGACY_QR_PREFIX];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function boxQrValue(boxId: string): BoxQrValue {
  return `${QR_PREFIX}${boxId}` as BoxQrValue;
}

/** Restituisce l'id della scatola se il QR è dell'app (stivo:// o il vecchio boxly://), altrimenti null. */
export function parseBoxQr(data: string | null | undefined): string | null {
  if (!data) return null;
  const value = data.trim();
  const prefix = PREFIXES.find((p) => value.startsWith(p));
  if (!prefix) return null;
  const id = value.slice(prefix.length).replace(/\/$/, '');
  return UUID_RE.test(id) ? id.toLowerCase() : null;
}
