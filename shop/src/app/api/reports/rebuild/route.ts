import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { DailySnapshot } from '@/lib/models/DailySnapshot';
import { ValuationSnapshot } from '@/lib/models/ValuationSnapshot';

const QuerySchema = z.object({ date: z.string().optional(), kind: z.enum(['daily','valuation']).optional() });

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'owner')) {
    return NextResponse.json({ error: { message: 'مرفوض: المالك فقط' } }, { status: 403 });
  }
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { date, kind } = parsed.data;
  // placeholder: mark snapshots for date as needing rebuild (delete)
  if (!kind || kind === 'daily') {
    if (date) await DailySnapshot.deleteOne({ _id: date });
  }
  if (!kind || kind === 'valuation') {
    if (date) await ValuationSnapshot.deleteMany({ _id: new RegExp('^' + date) });
  }
  return NextResponse.json({ ok: true });
}

