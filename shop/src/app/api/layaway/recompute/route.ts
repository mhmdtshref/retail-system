import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Layaway } from '@/lib/models/Layaway';
import { Settings } from '@/lib/models/Settings';
import { computeStatus } from '@/lib/layaway/aging';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'AUDIT.VIEW');
  if (allowed !== true) return allowed;
  await dbConnect();
  const settings = await Settings.findById('global').lean();
  const list = await Layaway.find({ status: { $in: ['active','overdue'] } }).limit(1000);
  let updated = 0;
  for (const l of list) {
    const next = computeStatus({ status: l.status as any, dueAt: l.dueAt as any, createdAt: l.createdAt as any }, (settings as any) || {}, new Date());
    if (next !== l.status) {
      (l as any).status = next;
      if (next === 'forfeited') (l as any).forfeitedAt = new Date().toISOString();
      await (l as any).save();
      updated++;
    }
  }
  return NextResponse.json({ ok: true, updated });
}

