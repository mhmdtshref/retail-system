import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Layaway } from '@/lib/models/Layaway';
import { Settings } from '@/lib/models/Settings';
import { LayawayRemindSchema } from '@/lib/validators/layaway';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { renderArabicTemplate, sendEmail, sendSms, sendWebhook } from '@/lib/reminders/send';
import { sendNotification } from '@/lib/notifications/engine';

function canSendSince(ts?: string, hours = 48) {
  if (!ts) return true;
  const last = Date.parse(ts);
  return Date.now() - last >= hours * 3600 * 1000;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  // cashiers can send individual reminders; managers for batch (enforced elsewhere)
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing = await getIfExists(idk);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = LayawayRemindSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const lay = await Layaway.findById(params.id);
  if (!lay) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lay.reminder?.doNotContact) return NextResponse.json({ skipped: true, reason: 'do_not_contact' });
  const settings = await Settings.findById('global').lean();
  const shopName = (settings as any)?.locales?.shopInfo?.name_ar || '';
  const amountDue = lay.totals?.balance || 0;
  const tpl = renderArabicTemplate({ amountDue, dueDate: lay.dueAt, layawayCode: lay.code, shopName });
  const sent: string[] = [];
  for (const ch of parsed.data.channels) {
    if (ch === 'email') {
      if (!canSendSince(lay.reminder?.lastEmailAt)) continue;
      await sendEmail({ subject: tpl.subject, body: tpl.body, relayUrl: (settings as any)?.notifications?.email?.relayWebhookUrl });
      lay.reminder = { ...(lay.reminder || {}), lastEmailAt: new Date().toISOString() } as any;
      sent.push('email');
    } else if (ch === 'sms') {
      if (!canSendSince(lay.reminder?.lastSmsAt)) continue;
      await sendSms({ text: tpl.body, relayUrl: (settings as any)?.notifications?.sms?.relayWebhookUrl });
      lay.reminder = { ...(lay.reminder || {}), lastSmsAt: new Date().toISOString() } as any;
      sent.push('sms');
    } else if (ch === 'webhook') {
      if (!canSendSince(lay.reminder?.lastWebhookAt)) continue;
      const wh = (settings as any)?.notifications?.webhook || {};
      await sendWebhook(wh.url, wh.secret, { type: 'layaway.reminder', layawayId: String(lay._id), code: lay.code, amountDue, dueAt: lay.dueAt });
      lay.reminder = { ...(lay.reminder || {}), lastWebhookAt: new Date().toISOString() } as any;
      sent.push('webhook');
    }
  }
  await lay.save();
  try {
    await sendNotification({ event: 'LAYAWAY_DUE_SOON' as any, entity: { type: 'layaway', id: String(lay._id), code: lay.code }, customerId: String(lay.customerId), channels: parsed.data.channels as any, idempotencyKey: idk });
  } catch {}
  // TODO: Add audit log entry for reminder intent
  const res = { ok: true, sent };
  await saveResult(idk, res);
  return NextResponse.json(res);
}

