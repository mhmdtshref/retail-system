import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { TemplateUpdateSchema } from '@/lib/validators/notifications';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = TemplateUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const doc = await NotificationTemplate.findByIdAndUpdate(params.id, { $set: { ...parsed.data, updatedAt: new Date().toISOString() } }, { new: true }).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ template: doc });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  await NotificationTemplate.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { TemplateUpdateSchema } from '@/lib/validators/notifications';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = TemplateUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const update: any = { ...parsed.data, lastEditedBy: String(auth.user?.id || auth.user?._id || ''), updatedAt: new Date().toISOString() };
  delete update._id;
  const doc = await NotificationTemplate.findByIdAndUpdate(ctx.params.id, { $set: update, $inc: { version: 1 } }, { new: true }).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ template: doc });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  await dbConnect();
  await NotificationTemplate.deleteOne({ _id: ctx.params.id });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { NotificationTemplate } from '@/lib/models/NotificationTemplate';
import { TemplateUpdateSchema } from '@/lib/validators/notifications';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = TemplateUpdateSchema.safeParse({ ...body, _id: params.id });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { _id, ...rest } = parsed.data as any;
  await NotificationTemplate.updateOne({ _id }, { $set: { ...rest, updatedAt: new Date().toISOString(), lastEditedBy: String(auth.user?.id || auth.user?._id || '') } });
  const doc = await NotificationTemplate.findById(_id).lean();
  return NextResponse.json({ template: doc });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  await NotificationTemplate.deleteOne({ _id: params.id });
  return NextResponse.json({ ok: true });
}
