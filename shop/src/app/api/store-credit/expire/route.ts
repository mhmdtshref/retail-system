import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';

export async function POST(_req: Request) {
  const idempotencyKey = _req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }
  const res = mockDb.expireCredits();
  const result = { ...res };
  mockDb.set(idempotencyKey, result);
  return NextResponse.json(result);
}


