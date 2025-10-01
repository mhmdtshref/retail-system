import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';

const LineSchema = z.object({ sku: z.string(), qty: z.number().positive(), price: z.number().nonnegative() });
const PlanInstallmentSchema = z.object({ seq: z.number().int().positive(), dueDate: z.string(), amount: z.number().nonnegative(), paidAt: z.string().optional() });

const SaleSchema = z.object({
  mode: z.enum(['cash','card','partial']).default('cash'),
  lines: z.array(LineSchema),
  customerId: z.string().optional(),
  total: z.number().nonnegative(),
  downPayment: z.number().nonnegative().optional(),
  schedule: z.array(PlanInstallmentSchema).optional(),
  expiresAt: z.string().optional(),
  minDownPercent: z.number().min(0).max(100).optional()
});

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }

  const body = await req.json();
  const parsed = SaleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  if (input.mode === 'partial') {
    const down = input.downPayment ?? 0;
    try {
      const sale = mockDb.createPartialSale({ lines: input.lines, total: input.total, downPayment: down, minDownPercent: input.minDownPercent, schedule: input.schedule as any, expiresAt: input.expiresAt, customerId: input.customerId });
      const result = { saleId: sale._id, status: sale.status, remaining: sale.paymentPlan?.remaining ?? Math.max(0, sale.total - sale.paid), reservations: sale.reservations };
      mockDb.set(idempotencyKey, result);
      return NextResponse.json(result);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Failed to create partial sale' }, { status: 400 });
    }
  }

  const doc = mockDb.createSale(input.lines, input.total);
  const result = { saleId: String(doc._id) };
  mockDb.set(idempotencyKey, result);
  return NextResponse.json(result);
}

