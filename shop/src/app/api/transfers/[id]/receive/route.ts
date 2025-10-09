import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { TransferReceiveSchema } from '@/lib/validators/transfer';
import { receiveTransfer } from '@/lib/transfers/service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'INVENTORY.TRANSFER_RECEIVE');
  if (allowed !== true) return allowed;
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const body = await req.json();
  const parsed = TransferReceiveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const res = await receiveTransfer(params.id, parsed.data.receipts as any, auth.user?.id || auth.user?._id || 'anonymous', idempotencyKey);
  return NextResponse.json(res);
}
