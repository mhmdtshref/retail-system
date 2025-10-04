import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { ImportBatch } from '@/lib/models/ImportBatch';
import { Product } from '@/lib/models/Product';
import { z } from 'zod';
import { parseCsv } from '@/lib/csv';
import { generateSku } from '@/lib/sku';

const BodySchema = z.object({
  text: z.string().min(1), // CSV raw text (UTF-8)
  mapping: z.record(z.string()).optional() // optional manual mapping
});

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { headers, rows } = parseCsv(parsed.data.text);
  const mapping = parsed.data.mapping || {};

  const required = ['productCode','name_ar','name_en','size','color','retailPrice'];
  const col = (k: string) => mapping[k] || k;

  const results: Array<{ idx: number; outcome: 'insert'|'update'|'error'; messages: string[]; preview?: any }> = [];
  const seenSkus = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const messages: string[] = [];
    for (const k of required) {
      if (!r[col(k)] || r[col(k)].trim().length === 0) messages.push(`Missing ${k}`);
    }
    const retailPrice = Number(r[col('retailPrice')] || '');
    if (Number.isNaN(retailPrice) || retailPrice < 0) messages.push('Invalid retailPrice');
    const costPrice = r[col('costPrice')] ? Number(r[col('costPrice')]) : undefined;
    if (typeof costPrice !== 'undefined' && (Number.isNaN(costPrice) || costPrice < 0)) messages.push('Invalid costPrice');

    const productCode = r[col('productCode')]?.trim();
    const size = r[col('size')]?.trim();
    const color = r[col('color')]?.trim();
    const sku = (r[col('sku')] || generateSku(productCode, size, color)).trim();
    if (!sku) messages.push('Missing sku');
    if (seenSkus.has(sku)) messages.push('Duplicate SKU in file');
    seenSkus.add(sku);

    let outcome: 'insert'|'update'|'error' = 'insert';
    let preview: any = undefined;
    if (messages.length === 0) {
      // Check DB for existing product & variant
      const existing = await Product.findOne({ productCode }).lean();
      if (existing) {
        const hasVariant = (existing.variants || []).some((v: any) => v.sku === sku || (v.size === size && v.color === color));
        outcome = hasVariant ? 'update' : 'insert';
      } else {
        outcome = 'insert';
      }
      preview = {
        productCode,
        name_ar: r[col('name_ar')],
        name_en: r[col('name_en')],
        category: r[col('category')] || undefined,
        brand: r[col('brand')] || undefined,
        status: (r[col('status')] || 'active').toLowerCase() === 'archived' ? 'archived' : 'active',
        variant: {
          sku,
          size,
          color,
          barcode: r[col('barcode')] || undefined,
          costPrice,
          retailPrice
        }
      };
    }
    results.push({ idx: i + 2, outcome: messages.length ? 'error' : outcome, messages, preview });
  }

  const batch = await ImportBatch.create({
    type: 'products-basic',
    headers,
    mapping,
    rows: results.map((r) => ({ idx: r.idx, data: r.preview || {}, status: r.outcome === 'error' ? 'invalid' : 'valid', messages: r.messages }))
  });

  const counts = {
    insertedProducts: 0,
    updatedProducts: 0,
    insertedVariants: results.filter((r) => r.outcome === 'insert').length,
    updatedVariants: results.filter((r) => r.outcome === 'update').length,
    errors: results.filter((r) => r.outcome === 'error').map((r) => ({ row: r.idx, reason: r.messages.join('; ') }))
  };

  await ImportBatch.findByIdAndUpdate(batch._id, { summary: counts, status: 'validated' });
  return NextResponse.json({ batchId: batch._id, results, ...counts });
}


