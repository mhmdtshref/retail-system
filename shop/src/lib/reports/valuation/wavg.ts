import { dbConnect } from '@/lib/db/mongo';
import { StockMovement } from '@/lib/models/StockMovement';
import { Product } from '@/lib/models/Product';
import { mockDb } from '@/lib/mock/store';

export type ValuationRow = { sku: string; name?: string; units: number; unitCost: number; value: number };

export async function computeWeightedAverageAsOf(asOfUtc: Date, opts?: { includeReserved?: boolean }) {
  await dbConnect().catch(()=>{});
  const includeReserved = !!opts?.includeReserved;

  // Load all movements up to asOf
  let moves: Array<{ sku: string; type: string; quantity: number; unitCost?: number; occurredAt: Date }>=[];
  try {
    const docs = await StockMovement.find({ occurredAt: { $lte: asOfUtc } }).lean();
    moves = (docs as any[]).map((d) => ({ sku: d.sku, type: String(d.type), quantity: Number(d.quantity), unitCost: (d as any).unitCost, occurredAt: new Date(d.occurredAt) }));
  } catch {
    // fallback to mock
    try {
      const arr = (mockDb as any).listMovementsBySkus([]) as any[]; // empty -> not supported; fallback to global movements if exposed
      if (Array.isArray(arr)) {
        moves = arr.filter((m) => (m.occurredAt || 0) <= asOfUtc.getTime()).map((m) => ({ sku: m.sku, type: m.type, quantity: m.quantity, unitCost: m.unitCost, occurredAt: new Date(m.occurredAt) }));
      }
    } catch {}
  }

  // Group by SKU and compute running average
  const bySku = new Map<string, { units: number; avgCost: number }>();

  // Sort by time to maintain running average correctness
  moves.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  for (const m of moves) {
    const cur = bySku.get(m.sku) || { units: 0, avgCost: 0 };
    switch (m.type) {
      case 'purchase_in': {
        const qtyIn = Math.max(0, m.quantity);
        const cost = typeof m.unitCost === 'number' ? m.unitCost : cur.avgCost;
        const newUnits = cur.units + qtyIn;
        const newAvg = newUnits > 0 ? ((cur.units * cur.avgCost) + (qtyIn * cost)) / newUnits : cur.avgCost;
        bySku.set(m.sku, { units: newUnits, avgCost: newAvg });
        break;
      }
      case 'return_in': {
        const qtyIn = Math.max(0, m.quantity);
        // Assume returns re-enter at current avg cost
        const newUnits = cur.units + qtyIn;
        bySku.set(m.sku, { units: newUnits, avgCost: cur.avgCost });
        break;
      }
      case 'sale_out': {
        const qtyOut = Math.max(0, Math.abs(m.quantity));
        bySku.set(m.sku, { units: Math.max(0, cur.units - qtyOut), avgCost: cur.avgCost });
        break;
      }
      case 'return_out': {
        const qtyOut = Math.max(0, Math.abs(m.quantity));
        bySku.set(m.sku, { units: Math.max(0, cur.units - qtyOut), avgCost: cur.avgCost });
        break;
      }
      case 'adjustment': {
        const delta = m.quantity;
        const newUnits = Math.max(0, cur.units + delta);
        bySku.set(m.sku, { units: newUnits, avgCost: cur.avgCost });
        break;
      }
      case 'reservation_hold': {
        if (!includeReserved) {
          const hold = Math.max(0, Math.abs(m.quantity));
          bySku.set(m.sku, { units: Math.max(0, cur.units - hold), avgCost: cur.avgCost });
        }
        break;
      }
      case 'reservation_release': {
        if (!includeReserved) {
          const rel = Math.max(0, Math.abs(m.quantity));
          bySku.set(m.sku, { units: cur.units + rel, avgCost: cur.avgCost });
        }
        break;
      }
      default:
        break;
    }
  }

  // Enrich with product names if available
  const skus = Array.from(bySku.keys());
  let names: Record<string, string> = {};
  if (skus.length) {
    try {
      const prods = await Product.find({ 'variants.sku': { $in: skus } }, { productCode: 1, name_ar: 1, name_en: 1, variants: 1 }).lean();
      for (const p of (prods as any[])) {
        for (const v of (p.variants || [])) {
          if (skus.includes(v.sku)) names[v.sku] = p.name_ar || p.name_en || '';
        }
      }
    } catch {}
  }

  const rows: ValuationRow[] = skus.map((sku) => {
    const { units, avgCost } = bySku.get(sku)!;
    const value = units * (avgCost || 0);
    return { sku, name: names[sku], units, unitCost: avgCost || 0, value };
  }).sort((a, b) => a.sku.localeCompare(b.sku));

  const totals = rows.reduce((s, r) => ({ units: s.units + r.units, value: s.value + r.value }), { units: 0, value: 0 });
  return { method: 'WAVG' as const, rows, totals };
}

