import { dbConnect } from '@/lib/db/mongo';
import { Transfer, type TransferDoc } from '@/lib/models/Transfer';
import { StockLevel } from '@/lib/models/StockLevel';
import { Idempotency } from '@/lib/models/Idempotency';

function genCode() {
  const seq = Date.now().toString().slice(-6);
  return `TR-${new Date().getFullYear()}-${seq}`;
}

export async function createTransfer(input: { fromLocationId: string; toLocationId: string; lines: Array<{ sku: string; variantId?: string; qty: number }>; notes?: string; createdBy: string }, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const code = genCode();
  const t = await Transfer.create({ code, fromLocationId: input.fromLocationId, toLocationId: input.toLocationId, status: 'requested', lines: input.lines, notes: input.notes, audit: { createdBy: input.createdBy } });
  const result = { transfer: t.toObject() };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}

export async function approveTransfer(id: string, actor: string, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const t = await Transfer.findByIdAndUpdate(id, { $set: { status: 'approved', 'audit.updatedBy': actor } }, { new: true }).lean();
  const result = { transfer: t };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}

export async function pickTransfer(id: string, picks: Array<{ sku: string; variantId?: string; qty: number }>, actor: string, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const t = await Transfer.findById(id).lean();
  if (!t) throw new Error('Transfer not found');
  // increment picked per line (bounded by qty)
  const updatedLines = (t.lines || []).map((l: any) => {
    const p = picks.find((x) => x.sku === l.sku && (x.variantId || null) === (l.variantId || null));
    if (!p) return l;
    const nextPicked = Math.min(l.qty, Math.max(0, (l.picked || 0) + p.qty));
    return { ...l, picked: nextPicked };
  });
  const updated = await Transfer.findByIdAndUpdate(id, { $set: { lines: updatedLines, status: 'picking', 'audit.updatedBy': actor } }, { new: true }).lean();
  const result = { transfer: updated };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}

export async function dispatchTransfer(id: string, actor: string, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const t = await Transfer.findById(id).lean();
  if (!t) throw new Error('Transfer not found');
  if (!['approved','picking'].includes(t.status)) throw new Error('Invalid state');
  // decrement onHand at source by picked quantity
  for (const l of t.lines as any[]) {
    const picked = Math.max(0, Math.min(l.qty, l.picked || 0));
    if (picked > 0) {
      await StockLevel.findOneAndUpdate(
        { locationId: t.fromLocationId, sku: l.sku, variantId: l.variantId || null },
        { $inc: { onHand: -picked } },
        { upsert: true, new: true }
      );
    }
  }
  const updated = await Transfer.findByIdAndUpdate(id, { $set: { status: 'dispatched', inTransit: true, 'audit.updatedBy': actor } }, { new: true }).lean();
  const result = { transfer: updated };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}

export async function receiveTransfer(id: string, receipts: Array<{ sku: string; variantId?: string; qty: number }>, actor: string, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const t = await Transfer.findById(id).lean();
  if (!t) throw new Error('Transfer not found');
  if (!['dispatched','received'].includes(t.status)) throw new Error('Invalid state');
  // increment received lines (bounded by picked)
  const updatedLines = (t.lines || []).map((l: any) => {
    const r = receipts.find((x) => x.sku === l.sku && (x.variantId || null) === (l.variantId || null));
    if (!r) return l;
    const cap = Math.max(0, Math.min(l.qty, l.picked || 0));
    const nextReceived = Math.min(cap, Math.max(0, (l.received || 0) + r.qty));
    return { ...l, received: nextReceived };
  });
  // apply stock to destination for newly received delta
  const prevBySku = new Map<string, number>();
  (t.lines as any[]).forEach((l: any) => { prevBySku.set(`${l.sku}::${l.variantId || ''}`, Math.max(0, l.received || 0)); });
  for (const l of updatedLines as any[]) {
    const key = `${l.sku}::${l.variantId || ''}`;
    const before = prevBySku.get(key) || 0;
    const delta = Math.max(0, (l.received || 0) - before);
    if (delta > 0) {
      await StockLevel.findOneAndUpdate(
        { locationId: t.toLocationId, sku: l.sku, variantId: l.variantId || null },
        { $inc: { onHand: delta } },
        { upsert: true, new: true }
      );
    }
  }
  const allReceived = (updatedLines as any[]).every((l: any) => Math.max(0, l.received || 0) >= Math.min(l.qty, l.picked || 0));
  const status = allReceived ? 'received' : 'dispatched';
  const updated = await Transfer.findByIdAndUpdate(id, { $set: { lines: updatedLines, status, inTransit: !allReceived, 'audit.updatedBy': actor } }, { new: true }).lean();
  const result = { transfer: updated };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}

export async function cancelTransfer(id: string, actor: string, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const updated = await Transfer.findByIdAndUpdate(id, { $set: { status: 'canceled', 'audit.updatedBy': actor } }, { new: true }).lean();
  const result = { transfer: updated };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}
