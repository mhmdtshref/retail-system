import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Product } from '@/lib/models/Product';
import { z } from 'zod';
import { ProductSchema } from '@/lib/validators/product';
import { getIfExists, saveResult } from '@/lib/idempotency';

const ListQuery = z.object({
  q: z.string().optional(),
  status: z.enum(['active','archived']).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export async function GET(req: Request) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = ListQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { q, status, category, brand, size, color, page, pageSize } = parsed.data;

  const query: any = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (size) query['variants.size'] = size;
  if (color) query['variants.color'] = color;
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { productCode: regex },
      { name_ar: regex },
      { name_en: regex },
      { brand: regex },
      { category: regex }
    ];
  }

  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    Product.find(query).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
    Product.countDocuments(query)
  ]);
  return NextResponse.json({ items, page, pageSize, total });
}

export async function POST(req: Request) {
  await dbConnect();
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  const existing = await getIfExists(idempotencyKey);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = ProductSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // Enforce unique productCode and variant.sku via indexes; rely on Mongo errors for duplicates
  const doc = await Product.create(parsed.data);
  const res = { product: doc.toObject() };
  await saveResult(idempotencyKey, res);
  return NextResponse.json(res);
}


