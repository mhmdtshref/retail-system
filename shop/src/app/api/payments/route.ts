import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Payment } from '@/lib/models/Payment';
import { Sale } from '@/lib/models/Sale';
import { Idempotency } from '@/lib/models/Idempotency';

const PaymentSchema = z.object({
  saleId: z.string(),
  method: z.enum(['cash', 'card', 'partial']),
  amount: z.number().positive(),
  seq: z.number().int().nonnegative()
});

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  await dbConnect();
  const existing = await Idempotency.findOne({ key: idempotencyKey });
  if (existing) return NextResponse.json(existing.result);

  const body = await req.json();
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sale = await Sale.findById(parsed.data.saleId);
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

  await Payment.create(parsed.data);
  const newPaid = (sale.paid || 0) + parsed.data.amount;
  sale.paid = newPaid;
  sale.status = newPaid >= (sale.total || 0) ? 'PAID' : 'PARTIAL';
  await sale.save();

  const result = { ok: true, paid: sale.paid, status: sale.status };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}

