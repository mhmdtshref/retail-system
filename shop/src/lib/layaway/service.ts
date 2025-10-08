import { dbConnect } from '@/lib/db/mongo';
import { Layaway, type LayawayDoc } from '@/lib/models/Layaway';
import { Sale } from '@/lib/models/Sale';
import { Payment } from '@/lib/models/Payment';
import { getSettings } from '@/lib/settings/index';
import { computeStatus } from '@/lib/layaway/aging';
import { mockDb } from '@/lib/mock/store';

function humanCode() {
  return 'LA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createLayaway(input: { saleId: string; customerId: string; upfrontPaid: number; actorId?: string }): Promise<LayawayDoc> {
  await dbConnect();
  const settings = await getSettings();
  let sale: any = await Sale.findById(input.saleId).lean();
  if (!sale) {
    try { sale = mockDb.getSale(input.saleId); } catch {}
  }
  if (!sale) throw new Error('Sale not found');
  const total = Number((sale as any).total || sale.total || 0);
  const minPct = Number(settings?.payments?.partial?.minUpfrontPct ?? 10);
  const minAmount = Math.ceil((total * minPct) / 100);
  if (input.upfrontPaid < minAmount) {
    throw new Error('Upfront below minimum');
  }
  const nowIso = new Date().toISOString();
  const maxDays = Number(settings?.payments?.partial?.maxDays ?? 30);
  const dueAt = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000).toISOString();
  const code = humanCode();
  const items = ((sale as any).lines || sale.lines || []).map((l: any) => ({ sku: l.sku, qty: l.qty, unitPrice: l.price }));
  const balance = Math.max(0, total - input.upfrontPaid);
  const status: LayawayDoc['status'] = balance === 0 ? 'completed' : 'active';
  const doc = await Layaway.create({
    code,
    customerId: input.customerId,
    saleId: input.saleId,
    items,
    totals: { grandTotal: total, upfrontPaid: input.upfrontPaid, balance },
    payments: input.upfrontPaid > 0 ? [{ amount: input.upfrontPaid, method: 'cash', at: nowIso }] : [],
    status,
    createdAt: nowIso,
    dueAt,
    lastPaymentAt: input.upfrontPaid > 0 ? nowIso : undefined,
    completedAt: balance === 0 ? nowIso : undefined,
    audit: { createdBy: input.actorId }
  });
  return doc.toObject();
}

export async function getLayaway(id: string): Promise<LayawayDoc | null> {
  await dbConnect();
  const d = await Layaway.findById(id).lean();
  return d as any;
}

export async function listLayaways(filter: any): Promise<{ items: LayawayDoc[] }> {
  await dbConnect();
  const q: any = {};
  if (filter?.status) q.status = filter.status;
  if (filter?.customerId) q.customerId = filter.customerId;
  if (filter?.dateFrom || filter?.dateTo) {
    q.createdAt = {};
    if (filter.dateFrom) q.createdAt.$gte = new Date(filter.dateFrom).toISOString();
    if (filter.dateTo) q.createdAt.$lte = new Date(filter.dateTo).toISOString();
  }
  const items = await Layaway.find(q).sort({ dueAt: 1 }).limit(Number(filter?.limit || 50)).lean();
  return { items: items as any };
}

export async function recordLayawayPayment(id: string, input: { amount: number; method: 'cash'|'card'|'transfer'|'store_credit' }): Promise<LayawayDoc> {
  await dbConnect();
  const d = await Layaway.findById(id);
  if (!d) throw new Error('Layaway not found');
  const nowIso = new Date().toISOString();
  const nextBalance = Math.max(0, d.totals.grandTotal - (d.totals.upfrontPaid + d.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0) + input.amount));
  d.payments.push({ amount: input.amount, method: input.method, at: nowIso } as any);
  d.totals.balance = nextBalance;
  d.lastPaymentAt = nowIso;
  if (nextBalance === 0) {
    d.status = 'completed';
    d.completedAt = nowIso;
  }
  await d.save();
  return d.toObject() as any;
}

export async function cancelLayaway(id: string): Promise<LayawayDoc> {
  await dbConnect();
  const d = await Layaway.findById(id);
  if (!d) throw new Error('Layaway not found');
  d.status = 'canceled';
  d.canceledAt = new Date().toISOString();
  await d.save();
  return d.toObject() as any;
}

export async function forfeitLayaway(id: string): Promise<LayawayDoc> {
  await dbConnect();
  const d = await Layaway.findById(id);
  if (!d) throw new Error('Layaway not found');
  d.status = 'forfeited';
  d.forfeitedAt = new Date().toISOString();
  await d.save();
  return d.toObject() as any;
}

export async function recomputeStatuses(): Promise<{ updated: number }>{
  await dbConnect();
  const settings = await getSettings();
  const list = await Layaway.find({ status: { $in: ['active','overdue'] } }).lean();
  let updated = 0;
  for (const it of list as any[]) {
    const next = computeStatus(it.status, it.dueAt, { graceDays: settings?.payments?.partial?.graceDays, forfeitDays: settings?.payments?.partial?.forfeitDays, autoCancel: settings?.payments?.partial?.autoCancel });
    if (next !== it.status) {
      await Layaway.updateOne({ _id: it._id }, { $set: { status: next, ...(next === 'forfeited' ? { forfeitedAt: new Date().toISOString() } : {}) } });
      updated++;
    }
  }
  return { updated };
}

