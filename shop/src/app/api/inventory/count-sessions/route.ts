import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { z } from 'zod';
import { CountSessionCreateSchema } from '@/lib/validators/count';
import { StockCountSession } from '@/lib/models/StockCountSession';
import { Product } from '@/lib/models/Product';
import { getOnHandForSkusAtStart } from '@/lib/inventory/availability';
import { Idempotency } from '@/lib/models/Idempotency';

const ListQuerySchema = z.object({
  status: z.enum(['open','reviewing','posted']).optional(),
  name: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50)
});

export async function GET(req: Request) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse({
    status: url.searchParams.get('status') || undefined,
    name: url.searchParams.get('name') || undefined,
    page: url.searchParams.get('page') || undefined,
    pageSize: url.searchParams.get('pageSize') || undefined
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { status, name, page, pageSize } = parsed.data;
  const q: any = {};
  if (status) q.status = status;
  if (name) q.name = new RegExp(name, 'i');
  const total = await StockCountSession.countDocuments(q);
  const docs = await StockCountSession.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean();
  return NextResponse.json({ total, page, pageSize, sessions: docs });
}

export async function POST(req: Request) {
  await dbConnect();
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing && existing.result) return NextResponse.json(existing.result);

  const body = await req.json();
  const parsed = CountSessionCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, scope, location } = parsed.data;
  // Determine SKUs based on scope
  let skus: string[] = [];
  if (scope.type === 'all') {
    const products = await Product.find({ status: { $ne: 'archived' } }, { variants: 1 }).lean();
    skus = products.flatMap((p: any) => (p.variants || []).map((v: any) => v.sku)).filter(Boolean);
  } else if (scope.type === 'filter') {
    const q: any = { status: { $ne: 'archived' } };
    if (scope.filter?.category) q.category = scope.filter.category;
    if (scope.filter?.brand) q.brand = scope.filter.brand;
    const products = await Product.find(q, { variants: 1 }).lean();
    skus = products.flatMap((p: any) => (p.variants || []).map((v: any) => v.sku)).filter(Boolean);
  } else if (scope.type === 'upload') {
    // For MVP, assume external upload already parsed into file and skus are provided later during counting; create empty items
    skus = [];
  }

  const onHandMap = await getOnHandForSkusAtStart(skus);
  const items = skus.map((sku) => ({ sku, onHandAtStart: onHandMap[sku] || 0 }));
  const session = await StockCountSession.create({ name, scope, location, items, status: 'open' });
  const result = { session: session.toObject() };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}


