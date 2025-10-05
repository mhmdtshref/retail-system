import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { mmToPt, A4_MM } from '@/lib/labels/mm';
import type { LabelItem, LabelOptions } from '@/lib/validators/labels';

function getPublicPath(...p: string[]): string {
  return path.join(process.cwd(), 'public', ...p);
}

let cairoFontBytes: Uint8Array | null = null;
async function loadCairoFont(): Promise<Uint8Array> {
  if (cairoFontBytes) return cairoFontBytes;
  const p = getPublicPath('fonts', 'cairo-regular.ttf');
  const bytes = await fs.promises.readFile(p);
  cairoFontBytes = new Uint8Array(bytes);
  return cairoFontBytes;
}

async function renderBarcodePng(text: string, symbology: 'code128'|'ean13'): Promise<Uint8Array> {
  return await new Promise<Uint8Array>((resolve, reject) => {
    bwipjs.toBuffer({ bcid: symbology, text, scale: 2, height: 12, includetext: false, textxalign: 'center', backgroundcolor: 'FFFFFF' }, (err: any, png: Buffer) => {
      if (err) return reject(err);
      resolve(new Uint8Array(png));
    });
  });
}

async function renderQrPng(text: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 0, scale: 4 });
  const base64 = dataUrl.split(',')[1];
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

export async function buildLabelsPdf(template: 'thermal-80'|'thermal-58'|'a4-3x8', items: LabelItem[], options: LabelOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const cairoFont = await loadCairoFont();
  const arabicFont = await doc.embedFont(cairoFont, { subset: true });
  const fallbackFont = await doc.embedFont(StandardFonts.Helvetica);

  function drawText(page: any, text: string, x: number, y: number, size: number, color = rgb(0,0,0)) {
    // Use Cairo for Arabic, Helvetica otherwise. Simple heuristic: any Arabic char 0600–06FF
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const font = hasArabic ? arabicFont : fallbackFont;
    page.drawText(text, { x, y, size, font, color });
  }

  const replicate = (list: LabelItem[]) => list.flatMap((it) => Array.from({ length: Math.max(1, it.qty || 1) }, () => ({ ...it })));
  const flatItems = replicate(items);

  if (template === 'thermal-80' || template === 'thermal-58') {
    const widthMm = template === 'thermal-80' ? 80 : 58;
    const heightMm = 40; // default height
    const pageWidth = mmToPt(widthMm);
    const pageHeight = mmToPt(heightMm);
    for (const it of flatItems) {
      const page = doc.addPage([pageWidth, pageHeight]);
      // Barcode
      const ean = options.barcodeType === 'ean13' || options.barcodeType === 'auto' ? it.barcode?.replace(/\D+/g,'') : undefined;
      const sym = ean && (ean.length === 12 || ean.length === 13) ? 'ean13' : 'code128';
      const text = sym === 'ean13' ? (ean!.length === 13 ? ean! : ean! /* pdf barcode library computes checksum in image */) : it.sku;
      const png = await renderBarcodePng(text, sym as any);
      const img = await doc.embedPng(png);
      const barW = pageWidth - mmToPt(10);
      const barH = mmToPt(12);
      page.drawImage(img, { x: mmToPt(5), y: pageHeight - mmToPt(15) - barH, width: barW, height: barH });

      // Texts
      let y = pageHeight - mmToPt(20);
      const priceStr = typeof it.price === 'number' ? it.price.toFixed(2) : '';
      if (options.show?.name) { drawText(page, it.name_ar || '', mmToPt(4), y, 9); y -= mmToPt(5); }
      if (options.show?.sku) { drawText(page, `SKU: ${it.sku}`, mmToPt(4), y, 8); y -= mmToPt(5); }
      if (options.show?.sizeColor) { const sc = [it.size, it.color].filter(Boolean).join(' / '); if (sc) { drawText(page, sc, mmToPt(4), y, 8); y -= mmToPt(5); } }
      if (options.show?.price && priceStr) { drawText(page, priceStr, mmToPt(4), y, 9); y -= mmToPt(5); }
      if (options.shop?.name) { drawText(page, options.shop.name, mmToPt(4), mmToPt(2), 7); }
    }
  } else if (template === 'a4-3x8') {
    const page = doc.addPage([mmToPt(A4_MM.width), mmToPt(A4_MM.height)]);
    const cols = 3; const rows = 8;
    const marginMm = 8; // safe margins
    const gutterMm = 4;
    const cellW = (A4_MM.width - marginMm*2 - gutterMm*(cols-1)) / cols;
    const cellH = (A4_MM.height - marginMm*2 - gutterMm*(rows-1)) / rows;
    for (let idx = 0; idx < Math.min(flatItems.length, cols*rows); idx++) {
      const it = flatItems[idx];
      const c = idx % cols; const r = Math.floor(idx / cols);
      const x0 = mmToPt(marginMm + c*(cellW + gutterMm));
      const y0 = mmToPt(A4_MM.height - marginMm - (r+1)*cellH - r*gutterMm);
      // Box
      page.drawRectangle({ x: x0, y: y0, width: mmToPt(cellW), height: mmToPt(cellH), borderColor: rgb(0,0,0), borderWidth: 0.5 });
      // Barcode
      const ean = options.barcodeType === 'ean13' || options.barcodeType === 'auto' ? it.barcode?.replace(/\D+/g,'') : undefined;
      const sym = ean && (ean.length === 12 || ean.length === 13) ? 'ean13' : 'code128';
      const text = sym === 'ean13' ? (ean!.length === 13 ? ean! : ean!) : it.sku;
      const png = await renderBarcodePng(text, sym as any);
      const img = await doc.embedPng(png);
      const barW = mmToPt(cellW - 6);
      const barH = mmToPt(10);
      page.drawImage(img, { x: x0 + mmToPt(3), y: y0 + mmToPt(cellH - 15), width: barW, height: barH });
      // Texts
      let y = y0 + mmToPt(cellH - 18);
      const priceStr = typeof it.price === 'number' ? it.price.toFixed(2) : '';
      if (options.show?.name) { drawText(page, it.name_ar || '', x0 + mmToPt(3), y, 9); y -= mmToPt(5); }
      if (options.show?.sku) { drawText(page, `SKU: ${it.sku}`, x0 + mmToPt(3), y, 8); y -= mmToPt(5); }
      if (options.show?.sizeColor) { const sc = [it.size, it.color].filter(Boolean).join(' / '); if (sc) { drawText(page, sc, x0 + mmToPt(3), y, 8); y -= mmToPt(5); } }
      if (options.show?.price && priceStr) { drawText(page, priceStr, x0 + mmToPt(3), y, 9); y -= mmToPt(5); }
      if (options.shop?.name) { drawText(page, options.shop.name, x0 + mmToPt(3), y0 + mmToPt(2), 7); }
    }
  }

  return await doc.save();
}
