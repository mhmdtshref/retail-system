import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { writeAudit } from '@/lib/security/audit';
import { FixJob } from '@/lib/models/FixJob';

const BodySchema = z.object({
  jobId: z.string().min(8).optional(),
  kind: z.enum(['order_totals','stock_reserved','layaway_balance','orphan_payments','transfer_state','customer_merge']),
  params: z.record(z.any()).default({}),
  dryRun: z.boolean().default(true)
});

function deterministicJobId(kind: string, body: any, userId: string) {
  const json = JSON.stringify({ kind, params: body.params, userId });
  const h = crypto.createHash('sha256').update(json).digest('hex').slice(0, 24);
  return `${kind}:${h}`;
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 60_000, burst: 5 }, 'api:admin:tools:fixes:run', String(auth.user?.id || ''));
  if (limited) return response!;

  const idk = req.headers.get('Idempotency-Key') || '';
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return applyRateHeaders(NextResponse.json({ error: { message: 'طلب غير صالح', issues: parsed.error.issues } }, { status: 400 }), headers);

  const { kind, params, dryRun } = parsed.data;
  const jobId = parsed.data.jobId || deterministicJobId(kind, { params }, String(auth.user?.id || ''));

  const existing = await FixJob.findOne({ jobId }).lean();
  if (existing) {
    return applyRateHeaders(NextResponse.json({ job: existing }), headers);
  }

  const doc = await FixJob.create({ jobId, kind, params, dryRun, status: 'queued', createdBy: String(auth.user?.id || ''), createdAt: new Date() } as any);

  await writeAudit({ action: 'settings.update', status: 'success', actor: { id: String(auth.user?.id || ''), role: (auth.user as any)?.role }, entity: { type: 'admin_tools', id: 'fixes' }, req, meta: { jobId, kind, dryRun } });

  return applyRateHeaders(NextResponse.json({ job: { _id: doc._id, jobId, kind, params, dryRun, status: 'queued' } }), headers);
}
