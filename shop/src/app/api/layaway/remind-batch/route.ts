import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Layaway } from '@/lib/models/Layaway';
import { LayawayListQuery, LayawayRemindSchema } from '@/lib/validators/layaway';
import { getBucket } from '@/lib/layaway/aging';
import { renderArabicTemplate, sendEmail, sendSms, sendWebhook } from '@/lib/reminders/send';
import { Settings } from '@/lib/models/Settings';
import { toCsv } from '@/lib/csv';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'PROMOS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const url = new URL(req.url);
  const qParsed = LayawayListQuery.pick({ status: true, bucket: true, customerId: true, dateFrom: true, dateTo: true, q: true }).safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!qParsed.success) return NextResponse.json({ error: qParsed.error.flatten() }, { status: 400 });
  const body = await req.json();
  const parsed = LayawayRemindSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { channels, preview } = parsed.data as any;
  const query: any = {};
  if (qParsed.data.status) query.status = qParsed.data.status;
  if (qParsed.data.customerId) query.customerId = qParsed.data.customerId;
  if (qParsed.data.dateFrom || qParsed.data.dateTo) {
    query.createdAt = {};
    if (qParsed.data.dateFrom) query.createdAt.$gte = qParsed.data.dateFrom;
    if (qParsed.data.dateTo) query.createdAt.$lte = qParsed.data.dateTo;
  }
  const list = await Layaway.find(query).lean();
  const today = new Date();
  const filtered = qParsed.data.bucket ? list.filter((it: any) => getBucket(it.dueAt, today) === qParsed.data.bucket) : list;
  const settings = await Settings.findById('global').lean();
  const shopName = (settings as any)?.locales?.shopInfo?.name_ar || '';
  const rows = filtered.map((l: any) => ({ code: l.code, customerId: String(l.customerId), amountDue: l.totals?.balance || 0, dueAt: l.dueAt }));
  const csv = toCsv(['code','customerId','amountDue','dueAt'], rows);
  if (preview) return NextResponse.json({ count: filtered.length, csv });
  // send via relay if configured
  const tplSamples = filtered.slice(0, 10).map((l: any) => renderArabicTemplate({ amountDue: l.totals?.balance || 0, dueDate: l.dueAt, layawayCode: l.code, shopName }));
  if (channels.includes('webhook') && (settings as any)?.notifications?.webhook?.url) {
    await sendWebhook((settings as any).notifications.webhook.url, (settings as any).notifications.webhook.secret, { type: 'layaway.reminder_batch', count: filtered.length, sample: tplSamples });
  }
  // For email/SMS, we export CSV for external sender
  return new NextResponse('\uFEFF' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="layaway-reminders.csv"' } });
}

