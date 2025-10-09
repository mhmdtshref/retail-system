import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Product } from '@/lib/models/Product';
import { z } from 'zod';

// Fast POS-oriented search: SKU/barcode exact/prefix and name regex (bounded)
// Projection limited to essentials and lean() for speed
const Query = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(25),
});

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { q, limit } = parsed.data;
  const needle = q.trim();

  // Prefer fast exact matches on variant indexes
  const exact = await Product.find(
    { $or: [ { 'variants.sku': needle }, { 'variants.barcode': needle } ] },
    { productCode: 1, name_ar: 1, name_en: 1, 'variants.sku': 1, 'variants.size': 1, 'variants.color': 1, 'variants.retailPrice': 1, 'variants.barcode': 1 }
  ).limit(50).lean();

  let results: any[] = exact;
  if (results.length === 0) {
    // Prefix search on SKU/barcode using index and $regex with anchor
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefix = await Product.find(
      { $or: [ { 'variants.sku': { $regex: `^${escaped}`, $options: 'i' } }, { 'variants.barcode': { $regex: `^${escaped}`, $options: 'i' } } ] },
      { productCode: 1, name_ar: 1, name_en: 1, 'variants.sku': 1, 'variants.size': 1, 'variants.color': 1, 'variants.retailPrice': 1, 'variants.barcode': 1 }
    ).limit(limit).lean();
    results = prefix;
  }

  // Flatten to per-variant rows for client simplicity
  const items: Array<{ sku: string; productCode?: string; name_ar?: string; name_en?: string; size?: string; color?: string; retailPrice: number; barcode?: string }>
    = [];
  for (const p of results) {
    const name_ar = p.name_ar; const name_en = p.name_en;
    for (const v of p.variants || []) {
      items.push({ sku: v.sku, productCode: p.productCode, name_ar, name_en, size: v.size, color: v.color, retailPrice: v.retailPrice, barcode: v.barcode });
      if (items.length >= limit) break;
    }
    if (items.length >= limit) break;
  }

  const etag = `W/"pos-search:${needle}:${items.length}"`;
  const res = NextResponse.json({ items });
  res.headers.set('ETag', etag);
  res.headers.set('Cache-Control', 'public, max-age=15');
  return res;
}
