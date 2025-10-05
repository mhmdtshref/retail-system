import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';

const PaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'transfer', 'cod_remit', 'store_credit']),
  amount: z.number().positive(),
  seq: z.number().int().nonnegative()
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }

  const body = await req.json();
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  const result = mockDb.addPayment({ saleId: id, ...parsed.data } as any);
  mockDb.set(idempotencyKey, result);
  return NextResponse.json(result);
}

