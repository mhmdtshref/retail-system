import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { RefundCreateSchema, RefundListQuerySchema } from '@/lib/validators/refund';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = RefundListQuerySchema.safeParse({
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
    method: url.searchParams.get('method') || undefined,
    status: url.searchParams.get('status') || undefined,
    customerId: url.searchParams.get('customerId') || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const q = parsed.data;
  const dateFrom = q.dateFrom ? Number(q.dateFrom) : undefined;
  const dateTo = q.dateTo ? Number(q.dateTo) : undefined;
  const results = mockDb.listRefunds({ dateFrom, dateTo, method: q.method as any, status: q.status as any, customerId: q.customerId });
  return NextResponse.json({ results });
}

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }
  const body = await req.json();
  const parsed = RefundCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { origin, customerId, method, amount, notes, externalRef } = parsed.data;
  try {
    const refund = mockDb.createRefund({ origin, customerId, method: method as any, amount, notes, externalRef });
    const result = { refundId: refund._id, refund };
    mockDb.set(idempotencyKey, result);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Failed' } }, { status: 400 });
  }
}


