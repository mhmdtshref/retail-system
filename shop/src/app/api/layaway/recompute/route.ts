import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { recomputeStatuses } from '@/lib/layaway/service';
import { getIfExists, saveResult } from '@/lib/idempotency';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  const idk = req.headers.get('Idempotency-Key') || '';
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const res = await recomputeStatuses();
  await saveResult(idk, res);
  return NextResponse.json(res);
}

