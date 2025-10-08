import { createHash } from 'crypto';
import { NotificationLog } from '@/lib/models/NotificationLog';
import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { Settings } from '@/lib/models/Settings';
import { Customer } from '@/lib/models/Customer';
import type { TemplateInput } from '@/lib/validators/notifications';
import { sendEmailViaRelay } from '@/lib/notifications/adapters/email';
import { sendSmsViaRelay } from '@/lib/notifications/adapters/sms';
import { sendWhatsAppViaRelay } from '@/lib/notifications/adapters/whatsapp';

export type Channel = 'email'|'sms'|'whatsapp';
export type EventKey = 'ORDER_CREATED'|'ORDER_PAID'|'SHIPMENT_CREATED'|'OUT_FOR_DELIVERY'|'DELIVERED'|'COD_REMINDER'|'LAYAWAY_CREATED'|'LAYAWAY_PAYMENT_POSTED'|'LAYAWAY_DUE_SOON'|'LAYAWAY_OVERDUE'|'LAYAWAY_FORFEITED';

function hashBody(text: string): string {
  return createHash('sha256').update(text || '').digest('hex');
}

function renderTemplate(body: string, data: Record<string, any>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => {
    const v = data[k];
    return v === undefined || v === null ? '' : String(v);
  });
}

export async function getSettingsDoc() {
  const s = await Settings.findById('global').lean();
  return s || ({} as any);
}

export async function getTemplateOrDefault(key: EventKey, channel: Channel, lang: 'ar'|'en') {
  const doc = await NotificationTemplate.findOne({ key, channel, lang }).lean();
  if (doc) return doc as unknown as TemplateInput;
  // Default fallback: simple Arabic-first examples per spec
  const defaults: Record<string, { ar?: { subject?: string; body: string }; en?: { subject?: string; body: string } }> = {
    ORDER_CREATED: { ar: { subject: `تم استلام طلبك رقم {orderCode}`, body: `تم استلام طلبك رقم {orderCode} بتاريخ {orderDate}. شكراً لتسوقك معنا.` }, en: { subject: `We received your order {orderCode}`, body: `Your order {orderCode} on {orderDate} has been received.` } },
    DELIVERED: { ar: { body: `تم تسليم طلبك {orderCode}. شكراً لتسوقك معنا.` }, en: { body: `Your order {orderCode} has been delivered. Thank you!` } },
    LAYAWAY_DUE_SOON: { ar: { body: `تذكير: تبقّى {balance} على حجزك {layawayCode}. تاريخ الاستحقاق {dueDate}.` }, en: { body: `Reminder: {balance} remaining for your layaway {layawayCode}. Due {dueDate}.` } }
  };
  const d = defaults[key] || { ar: { body: '{shopName}' }, en: { body: '{shopName}' } };
  const pick = (lang === 'ar' ? d.ar : d.en) || d.ar || d.en;
  return { key, channel, lang, name: `${key} ${channel} ${lang}`, subject: pick?.subject, body: pick?.body || '', variables: [] } as TemplateInput;
}

export async function checkConsentAndThrottle(input: { customerId: string; event: EventKey; channel: Channel }): Promise<{ allowed: boolean; reason?: string }> {
  const [cust, settings] = await Promise.all([
    Customer.findById(input.customerId).lean(),
    getSettingsDoc()
  ]);
  if (!cust) return { allowed: false, reason: 'no_customer' };
  const consent = (cust as any).consent || {};
  if (consent.doNotContact) return { allowed: false, reason: 'do_not_contact' };
  if (input.channel === 'email' && consent.email === false) return { allowed: false, reason: 'no_email_consent' };
  if (input.channel === 'sms' && consent.sms === false) return { allowed: false, reason: 'no_sms_consent' };
  if (input.channel === 'whatsapp' && consent.whatsapp === false) return { allowed: false, reason: 'no_whatsapp_consent' };
  const hours = (settings as any)?.notifications?.throttling?.hoursPerEvent ?? 24;
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const recent = await NotificationLog.findOne({ customerId: String(input.customerId), event: input.event, channel: input.channel, createdAt: { $gte: since } }).lean();
  if (recent) return { allowed: false, reason: 'throttled' };
  return { allowed: true };
}

export async function enqueueNotification(input: { event: EventKey; entity: { type: 'order'|'layaway'; id: string; code?: string }; customerId: string; channel: Channel; data: Record<string, any>; idempotencyKey: string; lang?: 'ar'|'en' }) {
  const settings = await getSettingsDoc();
  const channelsCfg = (settings as any)?.notifications?.channels || { email: true };
  if (!channelsCfg[input.channel]) {
    return { skipped: true, reason: 'channel_disabled' } as const;
  }
  const consent = await checkConsentAndThrottle({ customerId: input.customerId, event: input.event, channel: input.channel });
  const lang: 'ar'|'en' = input.lang || ((settings as any)?.locales?.defaultLang || 'ar');
  const tpl = await getTemplateOrDefault(input.event, input.channel, lang);
  const rendered = { subject: tpl.subject ? renderTemplate(tpl.subject, input.data) : undefined, body: renderTemplate(tpl.body, input.data) };
  const bodyHash = hashBody(rendered.body);
  try {
    const doc = await NotificationLog.create({
      event: input.event,
      channel: input.channel,
      entity: input.entity,
      customerId: input.customerId,
      to: { email: input.data.email, phone: input.data.phone, wa: input.data.wa },
      render: { lang, subject: rendered.subject, bodyHash },
      consentChecked: true,
      idempotencyKey: input.idempotencyKey,
      attempt: 0,
      status: consent.allowed ? 'queued' : (consent.reason === 'throttled' ? 'throttled' : 'unsubscribed'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
    return { ok: true, queued: consent.allowed, id: String((doc as any)._id), status: (doc as any).status } as const;
  } catch (e: any) {
    // idempotency uniqueness by (idempotencyKey, channel) to avoid duplicates
    return { ok: false as const, error: e?.message || 'enqueue_failed' };
  }
}

export async function deliverNow(input: { event: EventKey; entity: { type: 'order'|'layaway'; id: string; code?: string }; customerId: string; channel: Channel; data: Record<string, any>; idempotencyKey: string; lang?: 'ar'|'en'; baseUrl?: string }) {
  const settings = await getSettingsDoc();
  const channelsCfg = (settings as any)?.notifications?.channels || { email: true };
  if (!channelsCfg[input.channel]) return { skipped: true, reason: 'channel_disabled' } as const;
  const consent = await checkConsentAndThrottle({ customerId: input.customerId, event: input.event, channel: input.channel });
  const lang: 'ar'|'en' = input.lang || ((settings as any)?.locales?.defaultLang || 'ar');
  const tpl = await getTemplateOrDefault(input.event, input.channel, lang);
  const rendered = { subject: tpl.subject ? renderTemplate(tpl.subject, input.data) : undefined, body: renderTemplate(tpl.body, input.data) };
  const bodyHash = hashBody(rendered.body);
  const to = { email: input.data.email, phone: input.data.phone, wa: input.data.wa };
  const base = input.baseUrl || (process.env.NEXT_PUBLIC_BASE_URL || '');
  const webhook = { statusCallbackUrl: base ? `${base}/api/notifications/webhook/${input.channel}` : undefined, signature: undefined } as any;
  const metadata = { event: input.event, entity: input.entity.type, id: input.entity.id } as any;
  const created = await NotificationLog.create({
    event: input.event,
    channel: input.channel,
    entity: input.entity,
    customerId: input.customerId,
    to,
    render: { lang, subject: rendered.subject, bodyHash },
    consentChecked: true,
    idempotencyKey: input.idempotencyKey,
    attempt: 1,
    status: consent.allowed ? 'sent' : (consent.reason === 'throttled' ? 'throttled' : 'unsubscribed'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
  const logId = String((created as any)._id);
  if (!consent.allowed) return { ok: true, queued: false, id: logId, status: (created as any).status } as const;
  try {
    let resp: { status: number; id?: string } | undefined;
    if (input.channel === 'email') {
      resp = await sendEmailViaRelay((settings as any)?.notifications?.email?.relayWebhookUrl, { to: { email: to.email }, message: { subject: rendered.subject, text: rendered.body }, metadata, webhook } as any);
    } else if (input.channel === 'sms') {
      resp = await sendSmsViaRelay((settings as any)?.notifications?.sms?.relayWebhookUrl, { to: { phone: to.phone }, message: { text: rendered.body }, metadata, webhook } as any);
    } else if (input.channel === 'whatsapp') {
      resp = await sendWhatsAppViaRelay((settings as any)?.notifications?.whatsapp?.relayWebhookUrl, { to: { wa: to.wa }, message: { text: rendered.body }, metadata, webhook } as any);
    }
    await NotificationLog.updateOne({ _id: logId }, { $set: { status: 'sent', provider: { name: 'relay_webhook', responseCode: resp?.status, responseId: resp?.id }, updatedAt: new Date().toISOString() } } as any);
    return { ok: true as const, queued: false, id: logId, status: 'sent' as const };
  } catch (e: any) {
    await NotificationLog.updateOne({ _id: logId }, { $set: { status: 'failed', error: e?.message || 'send_failed', updatedAt: new Date().toISOString() } } as any);
    return { ok: false as const, id: logId, error: 'send_failed' };
  }
}

import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { NotificationLog } from '@/lib/models/NotificationLog';
import { Settings } from '@/lib/models/Settings';
import type { TemplateDoc } from '@/lib/models/NotificationTemplate';
import { DEFAULT_TEMPLATES, EVENT_CHANNEL_DEFAULTS, type EventKey } from './templates';
import { hashString } from './util';
import { sendEmailViaRelay } from './adapters/email';
import { sendSmsViaRelay } from './adapters/sms';
import { sendWhatsAppViaRelay } from './adapters/whatsapp';
import { Customer } from '@/lib/models/Customer';

export type Channel = 'email'|'sms'|'whatsapp';

export async function ensureDefaults() {
  const count = await NotificationTemplate.countDocuments({}).lean();
  if (count > 0) return;
  await NotificationTemplate.insertMany(DEFAULT_TEMPLATES.map(t => ({ ...t, version: 1 })));
}

function pickLang(customer: any, preferred: 'ar'|'en'|undefined): 'ar'|'en' {
  if (preferred) return preferred;
  // prefer Arabic if name_ar exists or global default is ar
  return (customer?.fullName_ar || customer?.firstName_ar) ? 'ar' : 'ar';
}

export async function renderTemplate(key: EventKey, channel: Channel, lang: 'ar'|'en', data: Record<string, any>) {
  let tpl: TemplateDoc | null = await NotificationTemplate.findOne({ key, channel, lang }).lean();
  if (!tpl) tpl = await NotificationTemplate.findOne({ key, channel, lang: 'en' }).lean();
  if (!tpl) {
    const def = DEFAULT_TEMPLATES.find(t => t.key === key && t.channel === channel && t.lang === lang) || DEFAULT_TEMPLATES.find(t => t.key === key && t.channel === channel && t.lang === 'en');
    if (!def) throw new Error('No template');
    tpl = def as any;
  }
  const subject = (tpl.subject || '').replace(/\{(\w+)\}/g, (_, v) => data?.[v] ?? '');
  const body = (tpl.body || '').replace(/\{(\w+)\}/g, (_, v) => data?.[v] ?? '');
  return { subject: subject || undefined, body };
}

async function isThrottled(event: EventKey, channel: Channel, entity: { type: 'order'|'layaway'; id: string }, hours: number): Promise<boolean> {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const recent = await NotificationLog.findOne({ 'entity.type': entity.type, 'entity.id': entity.id, event, channel, createdAt: { $gte: since } }).lean();
  return !!recent;
}

export async function sendNotification(input: { event: EventKey; entity: { type: 'order'|'layaway'; id: string; code?: string }; customerId: string; channels?: Channel[]; preferredLang?: 'ar'|'en'; idempotencyKey: string }) {
  const settings = await Settings.findById('global').lean();
  const channelsEnabled = (settings as any)?.notifications?.channels || { email: true, sms: false, whatsapp: false };
  const throttleHours: number = (settings as any)?.notifications?.throttling?.hoursPerEvent || 24;
  const templateDefaults = EVENT_CHANNEL_DEFAULTS[input.event];
  const channels: Channel[] = (input.channels && input.channels.length ? input.channels : (Object.entries(templateDefaults).filter(([,v]) => v).map(([k]) => k) as Channel[]))
    .filter((ch) => (channelsEnabled as any)[ch]);

  const customer = await Customer.findById(input.customerId).lean();
  if (!customer) throw new Error('customer not found');
  // consent & doNotContact (extend later when field exists)
  const consent = (customer as any).consent || {};
  const doNotContact = (customer as any).doNotContact === true;

  const lang = pickLang(customer, input.preferredLang);

  const results: Array<{ channel: Channel; status: string; id?: string; error?: string }> = [];

  for (const channel of channels) {
    if (doNotContact) {
      await NotificationLog.create({ event: input.event, channel, entity: input.entity, customerId: String(input.customerId), to: {}, render: { lang, bodyHash: '' }, consentChecked: true, idempotencyKey: `${input.idempotencyKey}:${channel}`, attempt: 0, status: 'unsubscribed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      results.push({ channel, status: 'unsubscribed' });
      continue;
    }
    if (channel === 'email' && consent.email === false) { results.push({ channel, status: 'unsubscribed' }); continue; }
    if (channel === 'sms' && consent.sms === false) { results.push({ channel, status: 'unsubscribed' }); continue; }
    // whatsapp consent uses sms for now unless field exists

    const idk = `${input.idempotencyKey}:${channel}`;
    const existing = await NotificationLog.findOne({ idempotencyKey: idk }).lean();
    if (existing) { results.push({ channel, status: existing.status }); continue; }

    if (await isThrottled(input.event, channel, input.entity, throttleHours)) {
      await NotificationLog.create({ event: input.event, channel, entity: input.entity, customerId: String(input.customerId), to: {}, render: { lang, bodyHash: '' }, consentChecked: true, idempotencyKey: idk, attempt: 0, status: 'throttled', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      results.push({ channel, status: 'throttled' });
      continue;
    }

    const contact = {
      email: (customer as any).email,
      phone: (customer as any).phones?.find((p: any) => p.primary)?.e164 || (customer as any).phones?.[0]?.e164,
      wa: (customer as any).phones?.find((p: any) => p.primary)?.e164
    };

    const data = { customerName: (customer as any).fullName_ar || (customer as any).fullName_en || '', shopName: (settings as any)?.locales?.shopInfo?.name_ar || (settings as any)?.locales?.shopInfo?.name_en || '', supportPhone: (settings as any)?.support?.phone, supportEmail: (settings as any)?.support?.email };
    const rendered = await renderTemplate(input.event, channel, lang, data as any);
    const bodyHash = hashString(`${rendered.subject || ''}\n${rendered.body}`);

    const logBase: any = { event: input.event, channel, entity: input.entity, customerId: String(input.customerId), to: contact, render: { lang, subject: rendered.subject, bodyHash }, consentChecked: true, idempotencyKey: idk, attempt: 1, status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    let providerRes: any = {};

    try {
      if (channel === 'email') {
        const relay = (settings as any)?.notifications?.email?.relayWebhookUrl;
        if (!relay) throw new Error('email relay not configured');
        providerRes = await sendEmailViaRelay(relay, { to: { email: contact.email }, message: { subject: rendered.subject, text: rendered.body }, metadata: { event: input.event, entity: input.entity.type, id: input.entity.id }, webhook: { statusCallbackUrl: '' } });
      } else if (channel === 'sms') {
        const relay = (settings as any)?.notifications?.sms?.relayWebhookUrl;
        if (!relay) throw new Error('sms relay not configured');
        providerRes = await sendSmsViaRelay(relay, { to: { phone: contact.phone }, message: { text: rendered.body }, metadata: { event: input.event, entity: input.entity.type, id: input.entity.id }, webhook: { statusCallbackUrl: '' } });
      } else if (channel === 'whatsapp') {
        const relay = (settings as any)?.notifications?.whatsapp?.relayWebhookUrl || (settings as any)?.notifications?.sms?.relayWebhookUrl;
        if (!relay) throw new Error('whatsapp relay not configured');
        const waNumber = contact.wa?.startsWith('whatsapp:') ? contact.wa : (contact.wa ? `whatsapp:${contact.wa}` : undefined);
        providerRes = await sendWhatsAppViaRelay(relay, { to: { wa: waNumber }, message: { text: rendered.body }, metadata: { event: input.event, entity: input.entity.type, id: input.entity.id }, webhook: { statusCallbackUrl: '' } });
      }
      await NotificationLog.create({ ...logBase, status: 'sent', provider: { name: 'relay_webhook', responseCode: providerRes.status, responseId: providerRes.id } });
      results.push({ channel, status: 'sent', id: providerRes.id });
    } catch (e: any) {
      await NotificationLog.create({ ...logBase, status: 'failed', error: e?.message });
      results.push({ channel, status: 'failed', error: e?.message });
    }
  }

  return { results };
}
