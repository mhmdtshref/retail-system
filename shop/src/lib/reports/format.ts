import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toCsvUtf8Bom } from './math';

export async function buildSimpleArabicPdfA4(title: string, rows: Array<[string, string]>) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let y = height - 40;
  page.drawText(title, { x: 40, y, size: 18, font, color: rgb(0,0,0) });
  y -= 24;
  for (const [k, v] of rows) {
    page.drawText(`${k}: ${v}`, { x: 40, y, size: 12, font, color: rgb(0,0,0) });
    y -= 16;
    if (y < 40) { y = height - 40; }
  }
  return await doc.save();
}

export function csvFromRows(headersAr: string[], rows: Array<Array<string|number>>): string {
  return toCsvUtf8Bom(headersAr, rows);
}

