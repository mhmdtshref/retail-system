import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { ReceiptsConfigSchema } from '@/lib/validators/settings';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { getSettings, updateReceipts } from '@/lib/settings/index';
import { verifyCsrf } from '@/lib/security/csrf';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { writeAudit } from '@/lib/security/audit';

export async function GET() {
  const s = await getSettings();
  return NextResponse.json(s.receipts || {});
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  const csrf = verifyCsrf(req);
  if (csrf !== true) return csrf;
  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 5 * 60 * 1000, burst: 2 }, 'api:settings:receipts', String((auth.user as any)?.id || (auth.user as any)?._id || ''));
  if (limited) {
    await writeAudit({ action: 'settings.update', status: 'denied', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, req });
    return response!;
  }
  const idk = req.headers.get('Idempotency-Key') || '';
  if (idk) {
    const cached = await getIfExists(idk);
    if (cached) return NextResponse.json(cached);
  }
  const body = await req.json();
  const parsed = ReceiptsConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await updateReceipts(String(auth.user?.id || auth.user?._id || ''), parsed.data);
  if (idk) await saveResult(idk, updated);
  await writeAudit({ action: 'settings.update', status: 'success', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, req });
  return applyRateHeaders(NextResponse.json(updated), headers);
}

