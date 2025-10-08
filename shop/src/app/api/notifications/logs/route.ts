import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { NotificationLog } from '@/lib/models/NotificationLog';
import { requireAuth, requireCan } from '@/lib/policy/api';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'AUDIT.VIEW');
  if (allowed !== true) return allowed;
  await dbConnect();
  const url = new URL(req.url);
  const limit = Math.min(200, Number(url.searchParams.get('limit') || 50));
  const items = await NotificationLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  return NextResponse.json({ items });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { NotificationLog } from '@/lib/models/NotificationLog';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'AUDIT.VIEW');
  if (allowed !== true) return allowed;
  await dbConnect();
  const url = new URL(req.url);
  const q: any = {};
  const event = url.searchParams.get('event');
  const channel = url.searchParams.get('channel');
  const status = url.searchParams.get('status');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  if (event) q.event = event;
  if (channel) q.channel = channel;
  if (status) q.status = status;
  if (dateFrom || dateTo) {
    q.createdAt = {};
    if (dateFrom) q.createdAt.$gte = dateFrom;
    if (dateTo) q.createdAt.$lte = dateTo;
  }
  const limit = Number(url.searchParams.get('limit') || 50);
  const cursor = url.searchParams.get('cursor') || undefined;
  const find = NotificationLog.find(q).sort({ createdAt: -1, _id: -1 }).limit(limit);
  if (cursor) find.where('_id').lt(cursor);
  const items = await find.lean();
  return NextResponse.json({ items, nextCursor: items.length === limit ? String(items[items.length - 1]._id) : undefined });
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { NotificationLog } from '@/lib/models/NotificationLog';

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') || 100);
  const items = await NotificationLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  return NextResponse.json({ items });
}
