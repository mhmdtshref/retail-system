import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const r = mockDb.voidRefund(id);
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ refund: r });
}


