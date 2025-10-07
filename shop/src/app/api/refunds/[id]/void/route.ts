import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { requireAuth, requireCan } from '@/lib/policy/api';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.REFUND_CONFIRM');
  if (allowed !== true) return allowed;
  const { id } = await context.params;
  const r = mockDb.voidRefund(id);
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ refund: r });
}


