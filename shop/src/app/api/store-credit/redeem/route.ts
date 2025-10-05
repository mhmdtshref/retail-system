import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { StoreCreditRedeemSchema } from '@/lib/validators/store-credit';

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }
  const body = await req.json();
  const parsed = StoreCreditRedeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { creditIdOrCode: raw, creditId, code, customerId, amount, saleId } = parsed.data as any;
  const creditIdOrCode = raw || creditId || code;
  if (!creditIdOrCode) return NextResponse.json({ error: { message: 'Missing credit identifier' } }, { status: 400 });
  try {
    const res = mockDb.redeemStoreCredit({ creditIdOrCode, customerId, amount, saleId, idempotencyKey });
    const result = { creditId: res.credit._id, remainingAmount: res.remainingAmount };
    mockDb.set(idempotencyKey, result);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Failed' } }, { status: 400 });
  }
}


