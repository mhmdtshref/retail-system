import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Sale } from '@/lib/models/Sale';
import { Idempotency } from '@/lib/models/Idempotency';
import { mockDb } from '@/lib/mock/store';

const SaleSchema = z.object({
  lines: z.array(z.object({ sku: z.string(), qty: z.number().positive(), price: z.number().nonnegative() })),
  customerId: z.string().optional(),
  total: z.number().nonnegative()
});

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  let useMock = false;
  try {
    await dbConnect();
  } catch {
    useMock = true;
  }
  if (!useMock) {
    const existing = await Idempotency.findOne({ key: idempotencyKey });
    if (existing) return NextResponse.json(existing.result);
  } else if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }

  const body = await req.json();
  const parsed = SaleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let result: { saleId: string };
  if (!useMock) {
    const doc = await Sale.create({ ...parsed.data, paid: 0, status: 'OPEN' });
    result = { saleId: String(doc._id) };
    await Idempotency.create({ key: idempotencyKey, result });
  } else {
    const doc = mockDb.createSale(parsed.data.lines, parsed.data.total);
    result = { saleId: String(doc._id) };
    mockDb.set(idempotencyKey, result);
  }
  return NextResponse.json(result);
}

