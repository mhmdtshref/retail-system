import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Layaway } from '@/lib/models/Layaway';
import { Settings } from '@/lib/models/Settings';
import { Sale } from '@/lib/models/Sale';
import { Payment } from '@/lib/models/Payment';
import { LayawayCreateSchema, LayawayListQuery } from '@/lib/validators/layaway';
import { getBucket, computeStatus } from '@/lib/layaway/aging';
import { getIfExists, saveResult } from '@/lib/idempotency';

function toClient(doc: any) {
  if (!doc) return doc;
  return doc;
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = LayawayListQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { status, bucket, q, customerId, dateFrom, dateTo, limit, cursor, cashier } = parsed.data as any;
  const query: any = {};
  if (status) query.status = status;
  if (customerId) query.customerId = customerId;
  if (cashier) query['audit.createdBy'] = cashier;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = dateFrom;
    if (dateTo) query.createdAt.$lte = dateTo;
  }
  if (q) {
    const re = new RegExp(q, 'i');
    query.$or = [{ code: re }, { notes: re }];
  }
  const find = Layaway.find(query).sort({ dueAt: 1, _id: -1 }).limit(limit);
  if (cursor) find.where('_id').lt(cursor);
  const items = await find.lean();
  const today = new Date();
  const withBuckets = items.map((it: any) => ({ ...it, bucket: getBucket(it.dueAt, today) }));
  const filtered = bucket ? withBuckets.filter((it: any) => it.bucket === bucket) : withBuckets;
  const stats = withBuckets.reduce((acc: any, it: any) => {
    if (it.bucket) acc[it.bucket] = (acc[it.bucket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return NextResponse.json({ items: filtered.map(toClient), stats, nextCursor: filtered.length === limit ? String(filtered[filtered.length - 1]._id) : undefined });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const body = await req.json();
  const parsed = LayawayCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { saleId, customerId, upfrontPaid, notes } = parsed.data;
  const settings = await Settings.findById('global').lean();
  const partial = (settings as any)?.payments?.partial || { enabled: false, minUpfrontPct: 10, maxDays: 30 };
  if (!partial.enabled) return NextResponse.json({ error: { message: 'الدفعات الجزئية ليست مفعلة' } }, { status: 400 });
  const sale = await Sale.findById(saleId).lean();
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  if (String(sale.customerId || '') !== String(customerId)) {
    return NextResponse.json({ error: { message: 'العميل غير مطابق للفاتورة' } }, { status: 400 });
  }
  const minAmount = Math.ceil(((sale.total || 0) * (partial.minUpfrontPct || 10)) / 100);
  if ((upfrontPaid || 0) < minAmount) {
    return NextResponse.json({ error: { message: 'الدفعة المقدمة أقل من الحد الأدنى. يتطلب موافقة المدير.' } }, { status: 400 });
  }
  const dueAt = new Date(Date.now() + (partial.maxDays || 30) * 24 * 60 * 60 * 1000).toISOString();
  const payments = await Payment.find({ saleId }).lean();
  const upfront = Math.min(upfrontPaid, sale.total || 0);
  const balance = Math.max(0, (sale.total || 0) - upfront);
  const code = `LA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const doc = await Layaway.create({
    code,
    customerId,
    saleId,
    items: (sale.lines || []).map((l: any) => ({ sku: l.sku, qty: l.qty, unitPrice: l.price })),
    totals: { grandTotal: sale.total || 0, upfrontPaid: upfront, balance },
    payments: (payments || []).map((p: any) => ({ paymentId: String(p._id), method: p.method, amount: p.amount, at: new Date(p.receivedAt || Date.now()).toISOString() })),
    status: balance > 0 ? 'active' : 'completed',
    createdAt: new Date().toISOString(),
    dueAt,
    lastPaymentAt: upfront > 0 ? new Date().toISOString() : undefined,
    notes,
    reminder: {},
    audit: { createdBy: String(auth.user?.id || auth.user?._id || '') }
  });
  // compute status if overdue by grace
  const status = computeStatus({ status: doc.status, dueAt: doc.dueAt, createdAt: doc.createdAt }, (settings as any) || {}, new Date());
  if (status !== doc.status) {
    (doc as any).status = status;
    await (doc as any).save?.();
  }
  const res = { layawayId: String(doc._id), code: doc.code, status: (doc as any).status, dueAt: doc.dueAt, balance: doc.totals.balance };
  await saveResult(idk, res);
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${idk}:notif:layaway_created` },
      body: JSON.stringify({ event: 'LAYAWAY_CREATED', entity: { type: 'layaway', id: String(doc._id) }, customerId })
    }).catch(()=>{});
  } catch {}
  return NextResponse.json(res);
}

