// @ts-expect-error - modulo interno di `qrcode` (puro JS, senza canvas/fs), privo di tipi
import { create as createQr } from 'qrcode/lib/core/qrcode';
import type { BoxOverview } from '@shared/types';

import { seasonLabel } from './labels';
import { boxQrValue } from './qr';

interface QrModules {
  size: number;
  get: (row: number, col: number) => number | boolean;
}

/** SVG del QR (vettoriale, nero su bianco, margine 2 moduli). */
export function qrSvg(value: string, sizeCss: string): string {
  const { modules } = createQr(value, { errorCorrectionLevel: 'M' }) as { modules: QrModules };
  const n = modules.size;
  const margin = 2;
  const total = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules.get(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${sizeCss}" height="${sizeCss}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

/**
 * Etichetta 6×6 cm (BRAND.md): QR al centro, nome in grassetto, luogo e stagione in piccolo,
 * wordmark "Boxly" in basso. `pageIsLabel` = la pagina è grande quanto l'etichetta (PDF da condividere).
 */
export function labelHtml(box: Pick<BoxOverview, 'id' | 'name' | 'location' | 'season'>, pageIsLabel: boolean): string {
  const meta = [box.location, box.season ? seasonLabel[box.season] : null].filter(Boolean).join(' · ');
  const page = pageIsLabel ? '@page { size: 6cm 6cm; margin: 0; }' : '@page { size: A4; margin: 1.5cm; }';
  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
${page}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { font-family: Inter, -apple-system, Helvetica, Arial, sans-serif; color: #1E1B16; }
.label { width: 6cm; height: 6cm; ${pageIsLabel ? '' : 'border: 1px dashed #B8742F;'} border-radius: 0.2cm;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 0.25cm; overflow: hidden; }
.qr { display: flex; align-items: center; justify-content: center; }
.name { font-weight: 700; font-size: 11pt; text-align: center; line-height: 1.15; max-width: 5.5cm;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { font-size: 7pt; color: #6B645A; text-align: center; min-height: 8pt; }
.brand { font-weight: 700; font-size: 8pt; color: #B8742F; letter-spacing: 0.02em; }
</style></head>
<body><div class="label">
  <div class="qr">${qrSvg(boxQrValue(box.id), '3.6cm')}</div>
  <div class="name">${esc(box.name)}</div>
  <div class="meta">${esc(meta)}</div>
  <div class="brand">Boxly</div>
</div></body></html>`;
}

/** 6 cm in punti tipografici (72 dpi) per expo-print. */
export const LABEL_PT = Math.round((6 / 2.54) * 72);
