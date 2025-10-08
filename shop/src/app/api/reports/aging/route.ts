import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/policy/api';
import { getLayawayAging } from '@/lib/reports/aging';

const QuerySchema = z.object({
  type: z.enum(['layaway','cod','store_credit']).default('layaway'),
  from: z.string(),
  to: z.string(),
  bucket: z.enum(['UPCOMING_7','PD_0_7','PD_8_14','PD_15_30','PD_GT_30']).optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const q = parsed.data;
  if (q.type === 'layaway') {
    const data = await getLayawayAging(q.from, q.to);
    const res = NextResponse.json({ ok: true, data });
    res.headers.set('Cache-Control', 'public, max-age=60');
    res.headers.set('ETag', `W/"aging:layaway:${q.from}:${q.to}:${data.totals.balance.toFixed(2)}"`);
    return res;
  }
  // TODO: implement COD & store credit aging
  return NextResponse.json({ ok: true, data: { range: { start: new Date(q.from).toISOString(), end: new Date(q.to).toISOString() }, buckets: [], totals: { count: 0, balance: 0, avgDaysPastDue: 0 } } });
}

