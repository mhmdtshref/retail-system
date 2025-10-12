import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { IdempotencyRecord } from '@/lib/models/IdempotencyRecord';

const QuerySchema = z.object({
  q: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional()
});

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  const { limited, response, headers } = await takeRateLimit(req, { limit: 30, windowMs: 60_000, burst: 10 }, 'api:admin:tools:idemp:search', String(auth.user?.id || ''));
  if (limited) return response!;

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) return applyRateHeaders(NextResponse.json({ error: { message: 'طلب غير صالح', issues: parsed.error.issues } }, { status: 400 }), headers);

  const { q, entityType, entityId, from, to } = parsed.data as any;
  const limit = Math.min(100, Number(parsed.data.limit || 50));

  const find: any = {};
  if (q) {
    find.$or = [ { _id: q }, { route: new RegExp(q, 'i') }, { requestHash: q } ];
  }
  if (entityType) find['entity.type'] = entityType;
  if (entityId) find['entity.id'] = entityId;
  if (from || to) {
    find.createdAt = {};
    if (from) (find.createdAt as any).$gte = new Date(from);
    if (to) (find.createdAt as any).$lte = new Date(to);
  }

  const items = await IdempotencyRecord.find(find).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
  return applyRateHeaders(NextResponse.json({ items }), headers);
}
