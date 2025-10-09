import { dbConnect } from '@/lib/db/mongo';
import { Location } from '@/lib/models/Location';
import { StockLevel } from '@/lib/models/StockLevel';

export async function resolveFulfillmentLocation(input: { customerCity?: string; preferredLocationId?: string; items: Array<{ sku: string; variantId?: string; qty: number }> }) {
  await dbConnect();
  // 1) Preferred location if has full stock and sellable
  if (input.preferredLocationId) {
    const loc = await Location.findById(input.preferredLocationId).lean();
    if (loc && loc.isSellable) {
      const levels = await StockLevel.find({ locationId: input.preferredLocationId, sku: { $in: input.items.map((i)=> i.sku) } }).lean();
      const ok = input.items.every((it) => {
        const l = (levels as any[]).find((x) => x.sku === it.sku && (x.variantId || null) === (it.variantId || null));
        const available = Math.max(0, Number(l?.onHand || 0) - Number(l?.reserved || 0));
        return available >= it.qty;
      });
      if (ok) return { locationId: input.preferredLocationId, reason: 'preferred' } as const;
    }
  }
  // 2) Nearest sellable with full stock (no split)
  const sellables = await Location.find({ isSellable: true }).lean();
  for (const loc of sellables as any[]) {
    const levels = await StockLevel.find({ locationId: String(loc._id), sku: { $in: input.items.map((i)=> i.sku) } }).lean();
    const ok = input.items.every((it) => {
      const l = (levels as any[]).find((x) => x.sku === it.sku && (x.variantId || null) === (it.variantId || null));
      const available = Math.max(0, Number(l?.onHand || 0) - Number(l?.reserved || 0));
      return available >= it.qty;
    });
    if (ok) return { locationId: String(loc._id), reason: 'nearest_full' } as const;
  }
  return { locationId: null, reason: 'none' } as const;
}
