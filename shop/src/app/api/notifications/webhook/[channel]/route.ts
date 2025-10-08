import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { NotificationLog } from '@/lib/models/NotificationLog';
import { Customer } from '@/lib/models/Customer';

export async function POST(req: NextRequest, { params }: { params: { channel: string } }) {
  await dbConnect();
  const channel = (params.channel || '').toLowerCase();
  try {
    const body = await req.json();
    // delivery status updates: expect payload to include an id we can correlate
    const status: string | undefined = body?.status || body?.event || undefined;
    const id: string | undefined = body?.id || body?.messageId || body?.providerId;
    if (id) {
      await NotificationLog.updateOne({ 'provider.responseId': id }, { $set: { status: mapStatus(status), updatedAt: new Date().toISOString() } } as any);
    }
    // STOP/UNSUB handling for sms/whatsapp
    const text: string = (body?.text || body?.message || '').toString().trim().toUpperCase();
    const from: string | undefined = body?.from || body?.sender;
    if ((channel === 'sms' || channel === 'whatsapp') && from && (text === 'STOP' || text === 'UNSUB' || text === 'UNSUBSCRIBE')) {
      // find recent notification to map to customer
      const recent = await NotificationLog.findOne({ channel: channel as any, $or: [{ 'to.phone': from }, { 'to.wa': from }] }).sort({ createdAt: -1 }).lean();
      if (recent?.customerId) {
        const patch: any = { 'consent.doNotContact': true };
        if (channel === 'sms') patch['consent.sms'] = false;
        if (channel === 'whatsapp') patch['consent.whatsapp'] = false;
        await Customer.updateOne({ _id: recent.customerId }, { $set: patch } as any);
        await NotificationLog.create({
          event: 'UNSUB', channel: channel as any,
          entity: { type: recent.entity.type, id: recent.entity.id, code: recent.entity.code },
          customerId: recent.customerId,
          to: recent.to,
          render: { lang: 'ar', bodyHash: 'unsub' },
          consentChecked: true,
          idempotencyKey: `unsub:${channel}:${recent.customerId}`,
          attempt: 0,
          status: 'unsubscribed',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        } as any);
      }
    }
  } catch {}
  return NextResponse.json({ ok: true });
}

function mapStatus(s?: string) {
  const k = (s || '').toLowerCase();
  if (['delivered','sent','ok'].includes(k)) return 'delivered';
  if (['failed','bounce','bounced'].includes(k)) return 'failed';
  return 'sent';
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { NotificationLog } from '@/lib/models/NotificationLog';
import { Customer } from '@/lib/models/Customer';

export async function POST(req: NextRequest, { params }: { params: { channel: string } }) {
  await dbConnect();
  const channel = params.channel as 'email'|'sms'|'whatsapp';
  const body = await req.json().catch(()=>({}));
  const status: string | undefined = body?.status || body?.event;
  const externalId: string | undefined = body?.id || body?.messageId || body?.externalId;
  const to: string | undefined = body?.to?.email || body?.to?.phone || body?.to?.wa;
  const text: string = (body?.text || body?.message || '').toString().toLowerCase();

  if (externalId) {
    await NotificationLog.updateOne({ 'provider.responseId': externalId }, { $set: { status: status === 'delivered' ? 'delivered' : status === 'failed' ? 'failed' : 'sent', updatedAt: new Date().toISOString() } } as any);
  }

  // Handle STOP/UNSUB for sms/whatsapp
  if ((channel === 'sms' || channel === 'whatsapp') && to && (text.includes('stop') || text.includes('unsubscribe') || text.includes('unsub'))) {
    await Customer.updateMany({ $or: [ { 'phones.e164': to.replace('whatsapp:','') }, { email: to } ] }, { $set: channel === 'sms' ? { 'consent.sms': false } : { 'consent.whatsapp': false } } as any);
    await NotificationLog.create({ event: 'UNSUB', channel, entity: { type: 'order', id: 'n/a' }, customerId: 'n/a', to: { [channel === 'sms' ? 'phone' : 'wa']: to } as any, render: { lang: 'ar', bodyHash: '' }, consentChecked: true, idempotencyKey: `unsub:${channel}:${to}:${Date.now()}`, attempt: 1, status: 'unsubscribed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { NotificationLog } from '@/lib/models/NotificationLog';
import { Customer } from '@/lib/models/Customer';

export async function POST(req: NextRequest, { params }: { params: { channel: 'email'|'sms'|'whatsapp' } }) {
  await dbConnect();
  const ch = params.channel;
  const body = await req.json().catch(()=>({}));
  // basic receipt mapping: expect { idempotencyKey?, status?, event?, to? , keyword? }
  const idk: string | undefined = body.idempotencyKey;
  const status: string | undefined = body.status;
  const to = body.to || {};
  const keyword: string | undefined = (body.keyword || '').toString().trim().toUpperCase();

  if (keyword === 'STOP' || keyword === 'UNSUB' || keyword === 'UNSUBSCRIBE') {
    // find customer by phone or email heuristically
    let customer: any = null;
    if (to?.phone) customer = await Customer.findOne({ 'phones.e164': to.phone }).lean();
    if (!customer && to?.wa) customer = await Customer.findOne({ 'phones.e164': (to.wa as string).replace(/^whatsapp:/,'') }).lean();
    if (!customer && to?.email) customer = await Customer.findOne({ email: to.email }).lean();
    if (customer) {
      const update: any = {};
      if (ch === 'sms') update['consent.sms'] = false;
      if (ch === 'whatsapp') update['consent.sms'] = false; // or consent.whatsapp when added
      if (ch === 'email') update['consent.email'] = false;
      await Customer.updateOne({ _id: customer._id }, { $set: update });
    }
    return NextResponse.json({ ok: true, action: 'unsubscribed' });
  }

  if (idk && status) {
    const doc = await NotificationLog.findOne({ idempotencyKey: idk }).lean();
    if (doc) {
      const map: any = { delivered: 'delivered', failed: 'failed', bounced: 'bounced', opened: 'sent', clicked: 'sent' };
      const st = map[status] || 'sent';
      await NotificationLog.updateOne({ _id: doc._id }, { $set: { status: st, updatedAt: new Date().toISOString() } });
    }
  }

  return NextResponse.json({ ok: true });
}
