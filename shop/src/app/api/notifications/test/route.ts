import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { SendTestSchema } from '@/lib/validators/notifications';
import { getTemplateOrDefault } from '@/lib/notifications/engine';
import { Settings } from '@/lib/models/Settings';
import { sendEmailViaRelay } from '@/lib/notifications/adapters/email';
import { sendSmsViaRelay } from '@/lib/notifications/adapters/sms';
import { sendWhatsAppViaRelay } from '@/lib/notifications/adapters/whatsapp';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = SendTestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { channel, to, key, lang, sampleData } = parsed.data as any;
  const settings = await Settings.findById('global').lean();
  const tpl = await getTemplateOrDefault(key, channel, lang);
  const data = sampleData || {};
  const text = (tpl.body || '').replace(/\{(\w+)\}/g, (_m: any, k: string) => (data[k] ?? ''));
  let result: any = { ok: true };
  if (channel === 'email') {
    const subject = (tpl.subject || '').replace(/\{(\w+)\}/g, (_m: any, k: string) => (data[k] ?? ''));
    const resp = await sendEmailViaRelay((settings as any)?.notifications?.email?.relayWebhookUrl, {
      to: { email: to?.email },
      message: { subject, text },
      metadata: { event: key, entity: 'order', id: 'test' },
      webhook: {}
    } as any);
    result = resp;
  } else if (channel === 'sms') {
    const resp = await sendSmsViaRelay((settings as any)?.notifications?.sms?.relayWebhookUrl, {
      to: { phone: to?.phone },
      message: { text },
      metadata: { event: key, entity: 'order', id: 'test' },
      webhook: {}
    } as any);
    result = resp;
  } else if (channel === 'whatsapp') {
    const resp = await sendWhatsAppViaRelay((settings as any)?.notifications?.whatsapp?.relayWebhookUrl, {
      to: { wa: to?.wa },
      message: { text },
      metadata: { event: key, entity: 'order', id: 'test' },
      webhook: {}
    } as any);
    result = resp;
  }
  return NextResponse.json({ ok: true, result });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { SendTestSchema } from '@/lib/validators/notifications';
import { renderTemplate } from '@/lib/notifications/engine';
import { Settings } from '@/lib/models/Settings';
import { sendEmailViaRelay } from '@/lib/notifications/adapters/email';
import { sendSmsViaRelay } from '@/lib/notifications/adapters/sms';
import { sendWhatsAppViaRelay } from '@/lib/notifications/adapters/whatsapp';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = SendTestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { channel, to, key, lang, sampleData } = parsed.data;
  const rendered = await renderTemplate(key as any, channel as any, lang, sampleData || {});
  const settings = await Settings.findById('global').lean();
  try {
    if (channel === 'email') {
      const relay = (settings as any)?.notifications?.email?.relayWebhookUrl;
      if (!relay) return NextResponse.json({ preview: rendered, sent: false, reason: 'relay not configured' });
      const res = await sendEmailViaRelay(relay, { to: { email: to.email }, message: { subject: rendered.subject, text: rendered.body }, metadata: { event: key, entity: 'test', id: 'test' }, webhook: { statusCallbackUrl: '' } });
      return NextResponse.json({ preview: rendered, sent: true, provider: res });
    }
    if (channel === 'sms') {
      const relay = (settings as any)?.notifications?.sms?.relayWebhookUrl;
      if (!relay) return NextResponse.json({ preview: rendered, sent: false, reason: 'relay not configured' });
      const res = await sendSmsViaRelay(relay, { to: { phone: to.phone }, message: { text: rendered.body }, metadata: { event: key, entity: 'test', id: 'test' }, webhook: { statusCallbackUrl: '' } });
      return NextResponse.json({ preview: rendered, sent: true, provider: res });
    }
    if (channel === 'whatsapp') {
      const relay = (settings as any)?.notifications?.whatsapp?.relayWebhookUrl || (settings as any)?.notifications?.sms?.relayWebhookUrl;
      if (!relay) return NextResponse.json({ preview: rendered, sent: false, reason: 'relay not configured' });
      const wa = to.wa && to.wa.startsWith('whatsapp:') ? to.wa : (to.wa ? `whatsapp:${to.wa}` : undefined);
      const res = await sendWhatsAppViaRelay(relay, { to: { wa }, message: { text: rendered.body }, metadata: { event: key, entity: 'test', id: 'test' }, webhook: { statusCallbackUrl: '' } });
      return NextResponse.json({ preview: rendered, sent: true, provider: res });
    }
  } catch (e: any) {
    return NextResponse.json({ preview: rendered, sent: false, error: e?.message });
  }
  return NextResponse.json({ preview: rendered, sent: false });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { SendTestSchema } from '@/lib/validators/notifications';
import { renderTemplate } from '@/lib/notifications/engine';
import { Settings } from '@/lib/models/Settings';
import { sendEmailViaRelay } from '@/lib/notifications/adapters/email';
import { sendSmsViaRelay } from '@/lib/notifications/adapters/sms';
import { sendWhatsAppViaRelay } from '@/lib/notifications/adapters/whatsapp';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = SendTestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { channel, to, key, lang, sampleData } = parsed.data;
  const { subject, body: text } = await renderTemplate(key as any, channel as any, lang, sampleData || {});
  const settings = await Settings.findById('global').lean();
  if (channel === 'email') {
    const relay = (settings as any)?.notifications?.email?.relayWebhookUrl;
    if (!relay) return NextResponse.json({ error: { message: 'Email relay not configured' } }, { status: 400 });
    const res = await sendEmailViaRelay(relay, { to: { email: to.email }, message: { subject, text }, metadata: { event: key, entity: 'order', id: 'test' }, webhook: { statusCallbackUrl: '' } });
    return NextResponse.json({ ok: true, provider: res });
  }
  if (channel === 'sms') {
    const relay = (settings as any)?.notifications?.sms?.relayWebhookUrl;
    if (!relay) return NextResponse.json({ error: { message: 'SMS relay not configured' } }, { status: 400 });
    const res = await sendSmsViaRelay(relay, { to: { phone: to.phone }, message: { text }, metadata: { event: key, entity: 'order', id: 'test' }, webhook: { statusCallbackUrl: '' } });
    return NextResponse.json({ ok: true, provider: res });
  }
  if (channel === 'whatsapp') {
    const relay = (settings as any)?.notifications?.whatsapp?.relayWebhookUrl || (settings as any)?.notifications?.sms?.relayWebhookUrl;
    if (!relay) return NextResponse.json({ error: { message: 'WhatsApp relay not configured' } }, { status: 400 });
    const waNumber = to.wa?.startsWith('whatsapp:') ? to.wa : (to.wa ? `whatsapp:${to.wa}` : undefined);
    const res = await sendWhatsAppViaRelay(relay, { to: { wa: waNumber }, message: { text }, metadata: { event: key, entity: 'order', id: 'test' }, webhook: { statusCallbackUrl: '' } });
    return NextResponse.json({ ok: true, provider: res });
  }
  return NextResponse.json({ ok: false });
}
