import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Payment } from '@/lib/models/Payment';
import { Sale } from '@/lib/models/Sale';
import { Idempotency } from '@/lib/models/Idempotency';
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
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let result: any;
  if (!useMock) {
    const sale = await Sale.findById(parsed.data.saleId);
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    await Payment.create(parsed.data);
    const newPaid = (sale.paid || 0) + parsed.data.amount;
    sale.paid = newPaid;
    sale.status = newPaid >= (sale.total || 0) ? 'PAID' : 'PARTIAL';
    await sale.save();
    result = { ok: true, paid: sale.paid, status: sale.status };
    await Idempotency.create({ key: idempotencyKey, result });
  } else {
    result = mockDb.addPayment(parsed.data);
    mockDb.set(idempotencyKey, result);
  }
  return NextResponse.json(result);
}

