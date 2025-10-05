import type { LabelItem, LabelOptions } from '@/lib/validators/labels';

function computeEan13Checksum(digits12: string): number {
  const digits = digits12.split('').map((d) => Number(d));
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const weight = (i % 2 === 0) ? 1 : 3; // EAN-13 weights from the left (0-index)
    sum += digits[i] * weight;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

export function normalizeEan13(input?: string): string | null {
  if (!input) return null;
  const raw = input.replace(/\D+/g, '');
  if (raw.length === 13) return raw;
  if (raw.length === 12) return raw + computeEan13Checksum(raw);
  return null;
}

function zplEscape(text: string): string {
  // ZPL uses ^ and ~ as control chars; replace or strip any problematic chars
  return text.replace(/[\^~]/g, ' ').slice(0, 60);
}

type Field = { x: number; y: number; font?: string; h?: number; w?: number; text: string };

function fieldZpl(f: Field): string {
  const font = f.font || '0';
  const h = Math.max(10, Math.floor(f.h || 24));
  const w = Math.max(10, Math.floor(f.w || 24));
  return `^FO${f.x},${f.y}^A${font}N,${h},${w}^FD${zplEscape(f.text)}^FS`;
}

function code128Zpl(x: number, y: number, height: number, data: string): string {
  return `^FO${x},${y}^BY2,3,${Math.max(30, height)}^BCN,${Math.max(30, height)},Y,N,N^FD${zplEscape(data)}^FS`;
}

function ean13Zpl(x: number, y: number, height: number, data: string): string {
  return `^FO${x},${y}^BY2,3,${Math.max(30, height)}^BEN,${Math.max(30, height)},Y,N^FD${zplEscape(data)}^FS`;
}

export function buildZplForItems(items: LabelItem[], options: LabelOptions): string {
  // Assume 203dpi printer. Thermal widths: 80mm ~ 640 dots? Common is 80mm printable ~ 576 dots.
  // We'll set 576 width and 40mm height (~320 dots) per label as default.
  const LABEL_W = 576; // dots
  const LABEL_H = 320; // dots (~40mm)
  const lines: string[] = ['^XA'];
  for (const it of items) {
    for (let q = 0; q < (it.qty || 1); q++) {
      // Barcode
      const ean = options.barcodeType === 'ean13' || options.barcodeType === 'auto' ? normalizeEan13(it.barcode) : null;
      const barcodeData = ean || it.sku;
      const isEan = !!ean;
      const BAR_H = 120; // dots
      const BAR_Y = 20;
      const BAR_X = 30;
      lines.push(isEan ? ean13Zpl(BAR_X, BAR_Y, BAR_H, barcodeData) : code128Zpl(BAR_X, BAR_Y, BAR_H, barcodeData));

      // Text fields
      let y = BAR_Y + BAR_H + 12;
      const fields: Field[] = [];
      if (options.show?.sku) fields.push({ x: 30, y, text: `SKU: ${it.sku}` });
      if (options.show?.sizeColor) {
        const sc = [it.size, it.color].filter(Boolean).join(' / ');
        if (sc) { y += 26; fields.push({ x: 30, y, text: sc }); }
      }
      if (options.show?.price && typeof it.price === 'number') { y += 26; fields.push({ x: 30, y, text: `${it.price.toFixed(2)}` }); }
      if (options.show?.brand && it.brand) { y += 26; fields.push({ x: 30, y, text: it.brand }); }
      const dateStr = new Date().toISOString().slice(0, 10);
      if (options.shop?.name) { y += 26; fields.push({ x: 30, y, text: `${options.shop.name} ${dateStr}` }); }
      for (const f of fields) lines.push(fieldZpl(f));

      // Draw box boundary for clarity
      lines.push(`^FO0,0^GB${LABEL_W},${LABEL_H},1^FS`);
      // Print and clear for next label
      lines.push('^XZ');
      if (q < (it.qty || 1) - 1) lines.push('^XA');
    }
  }
  return lines.join('\n');
}
