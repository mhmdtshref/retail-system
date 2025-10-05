import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { StoreCreditIssueSchema } from '@/lib/validators/store-credit';

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }
  const body = await req.json();
  const parsed = StoreCreditIssueSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { customerId, amount, expiresAt, note, origin } = parsed.data;
  const expiresTs = expiresAt ? Date.parse(expiresAt) : undefined;
  const credit = mockDb.issueStoreCredit({ customerId, amount, expiresAt: expiresTs, note, origin });
  const result = { creditId: credit._id, code: credit.code, remainingAmount: credit.remainingAmount };
  mockDb.set(idempotencyKey, result);
  return NextResponse.json(result);
}


