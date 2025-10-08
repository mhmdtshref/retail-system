import { dbConnect } from '@/lib/db/mongo';
import { StockLevel } from '@/lib/models/StockLevel';
import { Idempotency } from '@/lib/models/Idempotency';

export async function adjustStock(input: { locationId: string; lines: Array<{ sku: string; variantId?: string; delta: number; reason?: string }>; actor?: string }, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const results: any[] = [];
  for (const line of input.lines) {
    const doc = await StockLevel.findOneAndUpdate(
      { locationId: input.locationId, sku: line.sku, variantId: line.variantId || null },
      { $inc: { onHand: line.delta } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  const result = { ok: true, levels: results };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}

export async function reserveStock(input: { locationId: string; orderId: string; items: Array<{ sku: string; variantId?: string; qty: number }> }, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const updated: any[] = [];
  for (const it of input.items) {
    const level = await StockLevel.findOne({ locationId: input.locationId, sku: it.sku, variantId: it.variantId || null }).lean();
    const onHand = Number(level?.onHand || 0);
    const reserved = Number(level?.reserved || 0);
    if (onHand - reserved < it.qty) {
      throw new Error(`Insufficient available for ${it.sku} at location`);
    }
    const next = await StockLevel.findOneAndUpdate(
      { locationId: input.locationId, sku: it.sku, variantId: it.variantId || null },
      { $inc: { reserved: it.qty } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    updated.push(next);
  }
  const result = { ok: true, levels: updated };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}

export async function releaseStock(input: { locationId: string; orderId?: string; items?: Array<{ sku: string; variantId?: string; qty: number }> }, idempotencyKey: string) {
  await dbConnect();
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return existing.result;
  const updated: any[] = [];
  for (const it of input.items || []) {
    const next = await StockLevel.findOneAndUpdate(
      { locationId: input.locationId, sku: it.sku, variantId: it.variantId || null },
      { $inc: { reserved: -Math.abs(it.qty) } },
      { new: true }
    ).lean();
    updated.push(next);
  }
  const result = { ok: true, levels: updated };
  await Idempotency.create({ key: idempotencyKey, result });
  return result;
}
