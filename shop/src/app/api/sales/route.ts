import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Sale } from '@/lib/models/Sale';
import { Idempotency } from '@/lib/models/Idempotency';

const SaleSchema = z.object({
  lines: z.array(z.object({ sku: z.string(), qty: z.number().positive(), price: z.number().nonnegative() })),
  customerId: z.string().optional(),
  total: z.number().nonnegative()
});

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  await dbConnect();
  const existing = await Idempotency.findOne({ key: idempotencyKey });
  if (existing) return NextResponse.json(existing.result);

  const body = await req.json();
  const parsed = SaleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const doc = await Sale.create({ ...parsed.data, paid: 0, status: 'OPEN' });
  const result = { saleId: String(doc._id) };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}

