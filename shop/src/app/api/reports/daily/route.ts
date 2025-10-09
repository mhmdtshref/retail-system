import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/policy/api';
import { getDailyReport, formatDailyCsvArabic } from '@/lib/reports/daily';
import { cache, cacheTags } from '@/lib/cache';

const QuerySchema = z.object({
  from: z.string(),
  to: z.string(),
  channel: z.enum(['retail','online']).optional(),
  cashier: z.string().optional(),
  payment: z.enum(['cash','card','transfer','store_credit','cod']).optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const q = parsed.data;
  const key = `report:daily:${q.from}:${q.to}:${q.channel || ''}:${q.cashier || ''}:${q.payment || ''}`;
  let hit = false;
  const cached = await cache.get<any>(`v1:${key}`);
  let data: any;
  if (cached) { data = cached; hit = true; }
  else {
    data = await cache.withCache(key, [cacheTags.reportDaily(q.from)], 600, async () => {
      return await getDailyReport({ from: q.from, to: q.to, channel: q.channel, cashier: q.cashier, payment: q.payment });
    });
  }
  const etag = `W/"daily:${q.from}:${q.to}:${q.channel || ''}:${q.cashier || ''}:${q.payment || ''}:${data.counters.netSales.toFixed(2)}"`;
  const res = NextResponse.json({ ok: true, data });
  res.headers.set('ETag', etag);
  res.headers.set('Cache-Control', 'public, max-age=60');
  res.headers.set('X-Cache', hit ? 'HIT' : 'MISS');
  return res;
}

