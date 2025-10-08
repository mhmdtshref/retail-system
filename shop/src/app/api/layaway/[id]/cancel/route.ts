import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { cancelLayaway } from '@/lib/layaway/service';
import { AuditLog } from '@/lib/models/AuditLog';

const BodySchema = z.object({ reason: z.string().optional() });

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  const idk = req.headers.get('Idempotency-Key') || '';
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const layaway = await cancelLayaway(id);
    try { await AuditLog.create({ action: 'layaway.canceled', subject: { type: 'Layaway', id: String(layaway._id) }, actorUserId: (auth as any).user?.id }); } catch {}
    const out = { layaway };
    await saveResult(idk, out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Failed' } }, { status: 400 });
  }
}

