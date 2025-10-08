import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { Layaway } from '@/lib/models/Layaway';
import { getSettings } from '@/lib/settings/index';
import { sendReminder } from '@/lib/reminders/send';
import { toCsv } from '@/lib/csv';

const BodySchema = z.object({
  filter: z.object({ status: z.string().optional(), bucket: z.string().optional() }).optional(),
  channels: z.array(z.enum(['email','sms','webhook'])).min(1),
  exportCsv: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  const idk = req.headers.get('Idempotency-Key') || '';
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const q: any = {};
  if (parsed.data.filter?.status) q.status = parsed.data.filter.status;
  const list = await Layaway.find(q).limit(500).lean();
  const settings = await getSettings();
  const results: any[] = [];
  for (const d of list as any[]) {
    if (d.reminder?.doNotContact) continue;
    const payload = { layawayId: String(d._id), layawayCode: d.code, amountDue: Number(d.totals?.balance || 0), dueDate: d.dueAt, shopName: settings?.locales?.shopInfo?.name_ar };
    const res = await sendReminder(parsed.data.channels as any, payload as any, settings as any);
    results.push({ id: String(d._id), code: d.code, amountDue: payload.amountDue, dueDate: payload.dueDate, sent: res.sent.join('|') });
  }
  const out: any = { count: results.length };
  if (parsed.data.exportCsv) {
    const csv = toCsv(['id','code','amountDue','dueDate','sent'], results);
    out.csv = `\uFEFF${csv}`;
  }
  await saveResult(idk, out);
  return NextResponse.json(out);
}

