import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';

const PaymentSchema = z.object({
  saleId: z.string(),
  method: z.enum(['cash', 'card', 'partial']),
  amount: z.number().positive(),
  seq: z.number().int().nonnegative()
});

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }

  const body = await req.json();
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = mockDb.addPayment(parsed.data);
  mockDb.set(idempotencyKey, result);
  return NextResponse.json(result);
}

