import { dbConnect } from '@/lib/db/mongo';
import { StockMovement } from '@/lib/models/StockMovement';
import { Product } from '@/lib/models/Product';
import { mockDb } from '@/lib/mock/store';

type Lot = { qty: number; cost: number };
export type ValuationRow = { sku: string; name?: string; units: number; unitCost: number; value: number };

export async function computeFIFOAsOf(asOfUtc: Date, opts?: { includeReserved?: boolean }) {
  await dbConnect().catch(()=>{});
  const includeReserved = !!opts?.includeReserved;

  let moves: Array<{ sku: string; type: string; quantity: number; unitCost?: number; occurredAt: Date }>=[];
  try {
    const docs = await StockMovement.find({ occurredAt: { $lte: asOfUtc } }).lean();
    moves = (docs as any[]).map((d) => ({ sku: d.sku, type: String(d.type), quantity: Number(d.quantity), unitCost: (d as any).unitCost, occurredAt: new Date(d.occurredAt) }));
  } catch {
    try {
      const arr = (mockDb as any).listMovementsBySkus([]) as any[];
      if (Array.isArray(arr)) {
        moves = arr.filter((m) => (m.occurredAt || 0) <= asOfUtc.getTime()).map((m) => ({ sku: m.sku, type: m.type, quantity: m.quantity, unitCost: m.unitCost, occurredAt: new Date(m.occurredAt) }));
      }
    } catch {}
  }

  moves.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const lotsBySku = new Map<string, Lot[]>();

  for (const m of moves) {
    const lots = lotsBySku.get(m.sku) || [];
    switch (m.type) {
      case 'purchase_in': {
        const qtyIn = Math.max(0, m.quantity);
        const cost = typeof m.unitCost === 'number' ? m.unitCost : (lots.length ? lots[0].cost : 0);
        if (qtyIn > 0) lots.push({ qty: qtyIn, cost });
        lotsBySku.set(m.sku, lots);
        break;
      }
      case 'return_in': {
        const qtyIn = Math.max(0, m.quantity);
        // Returns enter at current last lot cost for simplicity
        const cost = lots.length ? lots[lots.length - 1].cost : 0;
        if (qtyIn > 0) lots.push({ qty: qtyIn, cost });
        lotsBySku.set(m.sku, lots);
        break;
      }
      case 'sale_out': {
        let qty = Math.max(0, Math.abs(m.quantity));
        while (qty > 0 && lots.length) {
          const first = lots[0];
          const take = Math.min(first.qty, qty);
          first.qty -= take;
          qty -= take;
          if (first.qty <= 0) lots.shift();
        }
        lotsBySku.set(m.sku, lots);
        break;
      }
      case 'return_out': {
        // Negative adjustment to stock, treat as consuming from last lots (LIFO for write-off)
        let qty = Math.max(0, Math.abs(m.quantity));
        while (qty > 0 && lots.length) {
          const last = lots[lots.length - 1];
          const take = Math.min(last.qty, qty);
          last.qty -= take;
          qty -= take;
          if (last.qty <= 0) lots.pop();
        }
        lotsBySku.set(m.sku, lots);
        break;
      }
      case 'adjustment': {
        const delta = m.quantity;
        if (delta > 0) {
          const cost = lots.length ? lots[lots.length - 1].cost : 0;
          lots.push({ qty: delta, cost });
        } else if (delta < 0) {
          let qty = Math.abs(delta);
          while (qty > 0 && lots.length) {
            const last = lots[lots.length - 1];
            const take = Math.min(last.qty, qty);
            last.qty -= take;
            qty -= take;
            if (last.qty <= 0) lots.pop();
          }
        }
        lotsBySku.set(m.sku, lots);
        break;
      }
      case 'reservation_hold': {
        if (!includeReserved) {
          let qty = Math.max(0, Math.abs(m.quantity));
          while (qty > 0 && lots.length) {
            const last = lots[lots.length - 1];
            const take = Math.min(last.qty, qty);
            last.qty -= take;
            qty -= take;
            if (last.qty <= 0) lots.pop();
          }
          lotsBySku.set(m.sku, lots);
        }
        break;
      }
      case 'reservation_release': {
        if (!includeReserved) {
          const cost = lots.length ? lots[lots.length - 1].cost : 0;
          const qty = Math.max(0, Math.abs(m.quantity));
          if (qty > 0) lots.push({ qty, cost });
          lotsBySku.set(m.sku, lots);
        }
        break;
      }
      default:
        break;
    }
  }

  // Enrich names
  const skus = Array.from(lotsBySku.keys());
  const names: Record<string, string> = {};
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
    const lots = lotsBySku.get(sku) || [];
    const units = lots.reduce((s, l) => s + l.qty, 0);
    const value = lots.reduce((s, l) => s + (l.qty * l.cost), 0);
    const unitCost = units > 0 ? (value / units) : 0;
    return { sku, name: names[sku], units, unitCost, value };
  }).sort((a, b) => a.sku.localeCompare(b.sku));

  const totals = rows.reduce((s, r) => ({ units: s.units + r.units, value: s.value + r.value }), { units: 0, value: 0 });
  return { method: 'FIFO' as const, rows, totals };
}

