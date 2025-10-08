import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/policy/api';
import { computeFIFOAsOf } from '@/lib/reports/valuation/fifo';
import { computeWeightedAverageAsOf } from '@/lib/reports/valuation/wavg';

const QuerySchema = z.object({
  asOf: z.string(), // yyyy-mm-dd local
  method: z.enum(['FIFO','WAVG']).default('WAVG'),
  includeReserved: z.enum(['true','false']).optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const q = parsed.data;
  const asOfUtc = new Date(q.asOf + 'T23:59:59.999Z');
  const includeReserved = q.includeReserved === 'true';
  const resData = q.method === 'FIFO' ? await computeFIFOAsOf(asOfUtc, { includeReserved }) : await computeWeightedAverageAsOf(asOfUtc, { includeReserved });
  const res = NextResponse.json({ ok: true, data: resData });
  res.headers.set('ETag', `W/"valuation:${q.asOf}:${q.method}:${resData.totals.value.toFixed(2)}"`);
  res.headers.set('Cache-Control', 'public, max-age=120');
  return res;
}

