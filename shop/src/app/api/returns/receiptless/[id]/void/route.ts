import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { writeAudit } from '@/lib/security/audit';

const g = globalThis as unknown as { __slips?: Map<string, any> };
if (!g.__slips) g.__slips = new Map();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.REFUND_CONFIRM');
  if (allowed !== true) return allowed;
  const id = params.id;
  const slip: any = Array.from(g.__slips!.values()).find((s: any) => s._id === id);
  if (!slip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  slip.status = 'VOIDED';
  slip.approvedById = auth.user.id;
  await writeAudit({ action: 'refund.create', status: 'success', actor: { id: auth.user.id, role: auth.user.role }, req, entity: { type: 'ReturnSlip', id: slip._id, code: slip.slipCode }, meta: { void: true } });
  return NextResponse.json({ slip });
}
