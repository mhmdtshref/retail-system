import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { TransferCreateSchema } from '@/lib/validators/transfer';
import { createTransfer } from '@/lib/transfers/service';
import { dbConnect } from '@/lib/db/mongo';
import { Transfer } from '@/lib/models/Transfer';

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;
  const q: any = {};
  if (status) q.status = status;
  if (from) q.fromLocationId = from;
  if (to) q.toLocationId = to;
  const docs = await Transfer.find(q).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ transfers: docs.map((d: any) => ({ ...d, _id: String(d._id) })) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'INVENTORY.TRANSFER_CREATE');
  if (allowed !== true) return allowed;
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const body = await req.json();
  const parsed = TransferCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const res = await createTransfer({ ...parsed.data, createdBy: auth.user?.id || auth.user?._id || 'anonymous' } as any, idempotencyKey);
  return NextResponse.json(res);
}
