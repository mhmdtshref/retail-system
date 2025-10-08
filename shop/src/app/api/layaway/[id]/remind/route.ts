import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { Layaway } from '@/lib/models/Layaway';
import { AuditLog } from '@/lib/models/AuditLog';
import { getSettings } from '@/lib/settings/index';
import { sendReminder } from '@/lib/reminders/send';
import { Customer } from '@/lib/models/Customer';

const BodySchema = z.object({ channels: z.array(z.enum(['email','sms','webhook'])).min(1), preview: z.boolean().optional() });

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  const idk = req.headers.get('Idempotency-Key') || '';
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  const layaway = await Layaway.findById(id).lean();
  if (!layaway) return NextResponse.json({ error: { message: 'غير موجود' } }, { status: 404 });
  if ((layaway as any).reminder?.doNotContact) {
    return NextResponse.json({ skipped: true, reason: 'doNotContact' });
  }
  const settings = await getSettings();
  // Channel-level do-not-contact
  let allowedChannels: Array<'email'|'sms'|'webhook'> = parsed.data.channels as any;
  try {
    const cust = await Customer.findById((layaway as any).customerId).lean();
    if (cust) {
      allowedChannels = allowedChannels.filter((c: 'email'|'sms'|'webhook') => {
        if (c === 'sms') return (cust as any).consent?.sms !== false;
        if (c === 'email') return (cust as any).consent?.email !== false;
        return true;
      });
    }
  } catch {}
  // Throttle per channel: 48h
  const now = Date.now();
  const last = (layaway as any).reminder || {};
  allowedChannels = allowedChannels.filter((c: 'email'|'sms'|'webhook') => {
    const ts = c === 'email' ? last.lastEmailAt : c === 'sms' ? last.lastSmsAt : last.lastWebhookAt;
    if (!ts) return true;
    const delta = now - new Date(ts).getTime();
    return delta >= 48 * 60 * 60 * 1000;
  });
  if (allowedChannels.length === 0 && !parsed.data.preview) {
    return NextResponse.json({ skipped: true, reason: 'throttled' });
  }
  const amountDue = Number((layaway as any).totals?.balance || 0);
  const payload = {
    layawayId: String((layaway as any)._id),
    layawayCode: (layaway as any).code,
    customerName: undefined,
    phone: undefined,
    email: undefined,
    amountDue,
    dueDate: (layaway as any).dueAt,
    shopName: settings?.locales?.shopInfo?.name_ar
  };
  const res = await sendReminder(allowedChannels as any, payload as any, settings as any);
  try { await AuditLog.create({ action: 'layaway.reminder_intent', subject: { type: 'Layaway', id: String((layaway as any)._id) }, actorUserId: (auth as any).user?.id }); } catch {}
  if (!parsed.data.preview) {
    const patch: any = {};
    const iso = new Date().toISOString();
    if (allowedChannels.includes('email')) patch['reminder.lastEmailAt'] = iso;
    if (allowedChannels.includes('sms')) patch['reminder.lastSmsAt'] = iso;
    if (allowedChannels.includes('webhook')) patch['reminder.lastWebhookAt'] = iso;
    try { await Layaway.updateOne({ _id: (layaway as any)._id }, { $set: patch }); } catch {}
  }
  const out = { ok: true, preview: res.preview };
  await saveResult(idk, out);
  return NextResponse.json(out);
}

