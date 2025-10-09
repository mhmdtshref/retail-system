import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { AuditLog } from '@/lib/models/AuditLog';

function toCsv(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) =>
    v == null ? '' : String(v).includes(',') || String(v).includes('"') || String(v).includes('\n') ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => esc((r as any)[h])).join(','));
  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'AUDIT.VIEW');
  if (allowed !== true) return allowed;
  await dbConnect();
  const url = new URL(req.url);
  const q: any = {};
  const action = url.searchParams.get('action') || undefined;
  const actorId = url.searchParams.get('actorId') || undefined;
  const entityType = url.searchParams.get('entityType') || undefined;
  const entityId = url.searchParams.get('entityId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const dateFrom = url.searchParams.get('dateFrom') || undefined;
  const dateTo = url.searchParams.get('dateTo') || undefined;
  if (action) q.action = action;
  if (status) q.status = status;
  if (actorId) q['actor.id'] = actorId;
  if (entityType) q['entity.type'] = entityType;
  if (entityId) q['entity.id'] = entityId;
  if (dateFrom || dateTo) {
    q.createdAt = {};
    if (dateFrom) q.createdAt.$gte = new Date(dateFrom);
    if (dateTo) q.createdAt.$lte = new Date(dateTo);
  }
  const limit = Math.min(200, Number(url.searchParams.get('limit') || 50));
  const cursor = url.searchParams.get('cursor') || undefined;
  const find = AuditLog.find(q).sort({ createdAt: -1, _id: -1 }).limit(limit);
  if (cursor) find.where('_id').lt(cursor);
  const items = await find.lean();
  if ((url.searchParams.get('format') || '').toLowerCase() === 'csv') {
    const rows = items.map((it: any) => ({
      createdAt: it.createdAt?.toISOString?.() || it.createdAt,
      action: it.action,
      actorId: it.actor?.id,
      actorRole: it.actor?.role,
      entityType: it.entity?.type,
      entityId: it.entity?.id,
      status: it.status,
      ip: it.ip,
      ua: it.ua,
      requestId: it.requestId,
    }));
    const csv = toCsv(rows);
    return new NextResponse(csv, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8' } });
  }
  return NextResponse.json({ items, nextCursor: items.length === limit ? String(items[items.length - 1]._id) : undefined });
}

