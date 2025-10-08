import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { TemplatesQuerySchema, TemplateSchema } from '@/lib/validators/notifications';

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = TemplatesQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const query: any = {};
  if (parsed.data.key) query.key = parsed.data.key;
  if (parsed.data.channel) query.channel = parsed.data.channel;
  if (parsed.data.lang) query.lang = parsed.data.lang;
  const items = await NotificationTemplate.find(query).sort({ key: 1, channel: 1, lang: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const doc = await NotificationTemplate.findOneAndUpdate(
    { key: parsed.data.key, channel: parsed.data.channel, lang: parsed.data.lang },
    { $set: { ...parsed.data, updatedAt: new Date().toISOString() }, $inc: { version: 1 } },
    { upsert: true, new: true }
  );
  return NextResponse.json({ template: doc });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { TemplatesQuerySchema, TemplateCreateSchema } from '@/lib/validators/notifications';

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = TemplatesQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const q: any = {};
  if (parsed.data.key) q.key = parsed.data.key;
  if (parsed.data.channel) q.channel = parsed.data.channel;
  if (parsed.data.lang) q.lang = parsed.data.lang;
  const list = await NotificationTemplate.find(q).sort({ key: 1, channel: 1, lang: 1 }).lean();
  return NextResponse.json({ items: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = TemplateCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const exists = await NotificationTemplate.findOne({ key: parsed.data.key, channel: parsed.data.channel, lang: parsed.data.lang }).lean();
  if (exists) return NextResponse.json({ error: { message: 'Template exists' } }, { status: 409 });
  const doc = await NotificationTemplate.create({ ...parsed.data, version: 1, lastEditedBy: String(auth.user?.id || auth.user?._id || '') });
  return NextResponse.json({ template: { ...(doc.toObject ? doc.toObject() : doc) } });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { TemplateSchema } from '@/lib/validators/notifications';

export async function GET() {
  await dbConnect();
  const items = await NotificationTemplate.find({}).sort({ key: 1, channel: 1, lang: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const doc = await NotificationTemplate.create({ ...parsed.data, updatedAt: new Date().toISOString(), lastEditedBy: String(auth.user?.id || auth.user?._id || '') });
  return NextResponse.json({ template: { ...(doc.toObject?.() || doc) } });
}
