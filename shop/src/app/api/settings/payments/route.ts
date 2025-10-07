import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { PaymentRulesSchema } from '@/lib/validators/settings';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { getSettings, updatePayments } from '@/lib/settings/index';

export async function GET() {
  const s = await getSettings();
  return NextResponse.json(s.payments || {});
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  const idk = req.headers.get('Idempotency-Key') || '';
  if (idk) {
    const cached = await getIfExists(idk);
    if (cached) return NextResponse.json(cached);
  }
  const body = await req.json();
  const parsed = PaymentRulesSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await updatePayments(String(auth.user?.id || auth.user?._id || ''), parsed.data);
  if (idk) await saveResult(idk, updated);
  return NextResponse.json(updated);
}

