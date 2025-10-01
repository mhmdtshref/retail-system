import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }
  const { id } = await context.params;
  try {
    const result = mockDb.cancelLayaway(id);
    mockDb.set(idempotencyKey, result);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to cancel' }, { status: 400 });
  }
}

