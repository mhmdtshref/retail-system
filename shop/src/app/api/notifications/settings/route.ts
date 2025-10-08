import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Settings } from '@/lib/models/Settings';
import { NotificationSettingsSchema } from '@/lib/validators/notifications';

export async function GET() {
  await dbConnect();
  const doc = await Settings.findById('global').lean();
  const n = (doc as any)?.notifications || {};
  return NextResponse.json({ settings: n });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = NotificationSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const $set: any = { notifications: { ...(parsed.data as any) } };
  $set.notifications.updatedAt = new Date().toISOString();
  $set.notifications.updatedBy = String(auth.user?.id || auth.user?._id || '');
  const res = await Settings.updateOne({ _id: 'global' }, { $set }, { upsert: true } as any);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getSettings, updateNotifications } from '@/lib/settings/index';
import { NotificationSettingsSchema } from '@/lib/validators/notifications';

export async function GET() {
  const s = await getSettings();
  return NextResponse.json(s.notifications || {});
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  const body = await req.json();
  const parsed = NotificationSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const out = await updateNotifications(String(auth.user?.id || auth.user?._id || ''), parsed.data);
  return NextResponse.json(out.notifications || {});
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Settings } from '@/lib/models/Settings';
import { NotificationSettingsSchema } from '@/lib/validators/notifications';
import { EVENT_CHANNEL_DEFAULTS } from '@/lib/notifications/templates';

export async function GET() {
  await dbConnect();
  const s = await Settings.findById('global').lean();
  const not = (s as any)?.notifications || {};
  const body = {
    channels: { email: !!not.channels?.email, sms: !!not.channels?.sms, whatsapp: !!not.channels?.whatsapp },
    email: not.email || {},
    sms: not.sms || {},
    whatsapp: not.whatsapp || {},
    throttling: not.throttling || { hoursPerEvent: 24 },
    autoSend: not.autoSend || EVENT_CHANNEL_DEFAULTS,
    updatedAt: (s as any)?.updatedAt,
    updatedBy: (s as any)?.updatedBy
  };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = NotificationSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const set: any = { 'notifications.channels': parsed.data.channels };
  if (parsed.data.email) set['notifications.email'] = parsed.data.email;
  if (parsed.data.sms) set['notifications.sms'] = parsed.data.sms;
  if (parsed.data.whatsapp) set['notifications.whatsapp'] = parsed.data.whatsapp;
  if (parsed.data.throttling) set['notifications.throttling'] = parsed.data.throttling;
  if (parsed.data.autoSend) set['notifications.autoSend'] = parsed.data.autoSend as any;
  set.updatedAt = new Date();
  set.updatedBy = String(auth.user?.id || auth.user?._id || '');
  await Settings.updateOne({ _id: 'global' }, { $set: set }, { upsert: true } as any);
  return NextResponse.json({ ok: true });
}
