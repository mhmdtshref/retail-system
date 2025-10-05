import { dbConnect } from '@/lib/db/mongo';
import { StockMovement } from '@/lib/models/StockMovement';
import availabilitySeed from '@/data/availability.json';
import { mockDb } from '@/lib/mock/store';

type Availability = { onHand: number; reserved: number; available: number };

type Movement = { sku: string; type: string; quantity: number };

function aggregateFromMovements(movements: Movement[]): Availability {
  let onHand = 0;
  let reserved = 0;
  for (const m of movements) {
    switch (m.type) {
      case 'purchase_in':
      case 'RETURN_IN':
      case 'RETURN': // legacy fallback
      case 'PURCHASE': // legacy fallback
        onHand += m.quantity;
        break;
      case 'sale_out':
      case 'RETURN_OUT':
      case 'SALE': // legacy fallback
        onHand -= Math.abs(m.quantity);
        break;
      case 'adjustment':
      case 'ADJUST': // legacy fallback
        onHand += m.quantity;
        break;
      case 'reservation_hold':
      case 'RESERVE': // legacy fallback
        reserved += Math.abs(m.quantity);
        break;
      case 'reservation_release':
      case 'RELEASE': // legacy fallback
        reserved -= Math.abs(m.quantity);
        break;
      default:
        break;
    }
  }
  if (reserved < 0) reserved = 0;
  const available = onHand - reserved;
  return { onHand, reserved, available };
}

export async function getAvailabilityBulk(skus: string[]): Promise<Record<string, Availability & { asOf: number }>> {
  const asOf = Date.now();
  // Try DB
  try {
    await dbConnect();
    const docs = await StockMovement.find({ sku: { $in: skus } }).lean();
    const bySku = new Map<string, Movement[]>();
    for (const d of docs as any[]) {
      const arr = bySku.get(d.sku) || [];
      // Normalize legacy types to new ones where possible
      const type: string = (d.type || '').toString();
      arr.push({ sku: d.sku, type: type, quantity: Number(d.quantity) });
      bySku.set(d.sku, arr);
    }
    const out: Record<string, Availability & { asOf: number }> = {};
    for (const sku of skus) {
      let source = bySku.get(sku) || [];
      // If DB has no movements for sku, fallback to in-memory mock movements
      if (source.length === 0) {
        try {
          source = mockDb.listMovementsBySkus([sku]) as any;
        } catch {}
      }
      const agg = aggregateFromMovements(source);
      out[sku] = { ...agg, asOf };
    }
    return out;
  } catch {
    // Fallback to seed/in-memory availability snapshot
    // Try in-memory movements first
    const out: Record<string, Availability & { asOf: number }> = {};
    try {
      for (const sku of skus) {
        const moves = mockDb.listMovementsBySkus([sku]) as any as Movement[];
        const agg = aggregateFromMovements(moves || []);
        out[sku] = { ...agg, asOf };
      }
      return out;
    } catch {}
    const map = new Map((availabilitySeed as any[]).map((a) => [a.sku, a]));
    for (const sku of skus) {
      const a = map.get(sku);
      out[sku] = a ? { onHand: a.onHand, reserved: a.reserved, available: a.available, asOf } : { onHand: 0, reserved: 0, available: 0, asOf };
    }
    return out;
  }
}

export async function getOnHandForSkusAtStart(skus: string[]): Promise<Record<string, number>> {
  const map = await getAvailabilityBulk(skus);
  const out: Record<string, number> = {};
  for (const sku of skus) out[sku] = map[sku]?.onHand ?? 0;
  return out;
}

