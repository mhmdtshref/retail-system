import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { ObsEvent } from '@/lib/models/ObsEvent';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { httpRequestDuration } from '@/lib/obs/metrics';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  await dbConnect();
  const now = Date.now();
  const since15 = new Date(now - 15 * 60 * 1000);
  const since24h = new Date(now - 24 * 60 * 60 * 1000);

  const lastErrors = await ObsEvent.find({ kind: 'error', createdAt: { $gte: since24h } }).sort({ createdAt: -1 }).limit(50).lean();
  const slowQueries = await ObsEvent.find({ kind: 'slow-query', createdAt: { $gte: since24h } }).sort({ createdAt: -1 }).limit(50).lean();

  // For now, return counts; histograms are in-process only and exposed via /_metrics
  const res = {
    errors: {
      last24h: lastErrors.length,
      latest: lastErrors.map(e => ({ id: String(e._id), time: e.createdAt, route: e.route, method: e.method, summary: e.message }))
    },
    slowQueries: slowQueries.map(q => ({ collection: q.collection, op: q.op, ms: q.durationMs, ts: q.createdAt })),
  };
  return NextResponse.json(res, { headers: { 'Cache-Control': 'no-store' } });
}
