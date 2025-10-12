import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { IdempotencyRecord } from '@/lib/models/IdempotencyRecord';

const BodySchema = z.object({ key: z.string().min(4), newKey: z.string().min(4).optional(), dryRun: z.boolean().optional() });

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  const { limited, response, headers } = await takeRateLimit(req, { limit: 20, windowMs: 60_000, burst: 10 }, 'api:admin:tools:idemp:replay', String(auth.user?.id || ''));
  if (limited) return response!;

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return applyRateHeaders(NextResponse.json({ error: { message: 'طلب غير صالح', issues: parsed.error.issues } }, { status: 400 }), headers);

  // Placeholder: only echo intent; actual re-run is wired to underlying handler in future step
  const record = await IdempotencyRecord.findById(parsed.data.key).lean();
  if (!record) return applyRateHeaders(NextResponse.json({ error: { message: 'غير موجود' } }, { status: 404 }), headers);

  return applyRateHeaders(NextResponse.json({ ok: true, simulate: !!parsed.data.dryRun, willUseKey: parsed.data.newKey || `${record._id}-rerun-${Date.now()}` }), headers);
}
