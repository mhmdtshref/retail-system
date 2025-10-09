import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { approveTransfer } from '@/lib/transfers/service';
import { verifyCsrf } from '@/lib/security/csrf';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { writeAudit } from '@/lib/security/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'INVENTORY.TRANSFER_APPROVE');
  if (allowed !== true) return allowed;
  const csrf = verifyCsrf(req);
  if (csrf !== true) return csrf;
  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 5 * 60 * 1000, burst: 2 }, 'api:transfers:approve', String((auth.user as any)?.id || (auth.user as any)?._id || ''));
  if (limited) {
    await writeAudit({ action: 'transfer.dispatch', status: 'denied', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, req });
    return response!;
  }
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const res = await approveTransfer(params.id, auth.user?.id || auth.user?._id || 'anonymous', idempotencyKey);
  await writeAudit({ action: 'transfer.dispatch', status: 'success', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, entity: { type: 'Transfer', id: params.id } });
  return applyRateHeaders(NextResponse.json(res), headers);
}
