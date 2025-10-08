import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Layaway } from '@/lib/models/Layaway';
import { LayawayCancelSchema } from '@/lib/validators/layaway';
import { getIfExists, saveResult } from '@/lib/idempotency';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'PROMOS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing = await getIfExists(idk);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = LayawayCancelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const lay = await Layaway.findById(params.id);
  if (!lay) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lay.status === 'completed' || lay.status === 'forfeited' || lay.status === 'canceled') {
    return NextResponse.json({ error: { message: 'لا يمكن إلغاء هذه الحالة' } }, { status: 400 });
  }
  lay.status = 'canceled';
  lay.canceledAt = new Date().toISOString();
  await lay.save();
  // TODO: audit log cancel
  const res = { ok: true, status: lay.status };
  await saveResult(idk, res);
  return NextResponse.json(res);
}

