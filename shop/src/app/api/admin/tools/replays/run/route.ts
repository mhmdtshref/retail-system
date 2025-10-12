import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { writeAudit } from '@/lib/security/audit';
import { ReplayJob } from '@/lib/models/ReplayJob';

const BodySchema = z.object({
  jobId: z.string().min(8).optional(),
  kind: z.enum(['webhook','delivery','notification','outbox']),
  ids: z.array(z.string()).min(1).max(100),
  options: z.object({ backoffMs: z.number().min(100).max(60_000).optional(), maxAttempts: z.number().min(1).max(10).optional() }).optional()
});

function deterministicJobId(kind: string, ids: string[], userId: string) {
  const json = JSON.stringify({ kind, ids, userId });
  const h = crypto.createHash('sha256').update(json).digest('hex').slice(0, 24);
  return `${kind}:${h}`;
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 60_000, burst: 5 }, 'api:admin:tools:replays:run', String(auth.user?.id || ''));
  if (limited) return response!;

  const idem = req.headers.get('Idempotency-Key') || '';
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return applyRateHeaders(NextResponse.json({ error: { message: 'طلب غير صالح', issues: parsed.error.issues } }, { status: 400 }), headers);

  const { kind, ids } = parsed.data;
  const jobId = parsed.data.jobId || deterministicJobId(kind, ids, String(auth.user?.id || ''));

  const existing = await ReplayJob.findOne({ jobId }).lean();
  if (existing) return applyRateHeaders(NextResponse.json({ job: existing }), headers);

  const doc = await ReplayJob.create({ jobId, kind, ids, attempts: 0, maxAttempts: parsed.data.options?.maxAttempts || 5, backoffMs: parsed.data.options?.backoffMs || 1000, status: 'queued', createdBy: String(auth.user?.id || ''), createdAt: new Date() } as any);

  await writeAudit({ action: 'settings.update', status: 'success', actor: { id: String(auth.user?.id || ''), role: (auth.user as any)?.role }, entity: { type: 'admin_tools', id: 'replays' }, req, meta: { jobId, kind, ids: ids.length } });

  return applyRateHeaders(NextResponse.json({ job: { _id: doc._id, jobId, kind, ids, status: 'queued' } }), headers);
}
