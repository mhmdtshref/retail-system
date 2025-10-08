import { Shipment } from '@/lib/models/Shipment';
import { Sale } from '@/lib/models/Sale';
import { Product } from '@/lib/models/Product';
import { mockDb } from '@/lib/mock/store';

type ComposedStatus = 'created'|'label_generated'|'handover'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned'|'cancelled';

const progressRank: Record<ComposedStatus, number> = {
  created: 0,
  label_generated: 1,
  handover: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
  failed: -1,
  returned: -2,
  cancelled: -3
};

export async function composeOrderTracking(orderId: string) {
  // Try Mongoose first; fallback to in-memory mock store
  let order: any = await Sale.findById(orderId).lean();
  if (!order) {
    const mock = mockDb.getSale(orderId);
    if (!mock) return null;
    order = { _id: mock._id, lines: mock.lines, total: mock.total, paid: mock.paid, status: mock.status, createdAt: new Date(mock.createdAt || Date.now()).toISOString() };
  }
  const shipments = await Shipment.find({ orderId }).sort({ createdAt: 1 }).lean();
  let overall: ComposedStatus = 'created';
  if (shipments.length) {
    const ranks = shipments.map((s: any) => progressRank[s.status as ComposedStatus] ?? 0);
    const minRank = Math.min(...ranks);
    if (minRank < 0) {
      // Any failure-like dominates
      overall = shipments.find((s: any) => ['failed','returned','cancelled'].includes(s.status))?.status as ComposedStatus || 'created';
    } else {
      // Overall is the minimum progress until all delivered
      const minIdx = ranks.indexOf(minRank);
      overall = shipments[minIdx]?.status as ComposedStatus || 'created';
      if (shipments.every((s: any) => s.status === 'delivered')) overall = 'delivered';
    }
  }
  const progressPct = overall === 'delivered' ? 100 : Math.max(5, Math.round(((progressRank[overall] || 0) / 5) * 100));

  // Enrich items with product info
  const lines = (order as any).lines || [];
  const skus: string[] = Array.from(new Set(lines.map((l: any) => l.sku).filter(Boolean)));
  let products: any[] = [];
  try {
    if (skus.length) products = await Product.find({ 'variants.sku': { $in: skus } }).lean();
  } catch {}
  const findVariant = (sku: string) => {
    const p = products.find((p: any) => (p.variants || []).some((v: any) => v.sku === sku));
    const v = p ? (p.variants || []).find((v: any) => v.sku === sku) : null;
    return { product: p, variant: v };
  };
  const items = lines.map((l: any) => {
    const { product, variant } = findVariant(l.sku);
    return {
      sku: l.sku,
      name: product?.name_ar || product?.name_en || l.sku,
      size: variant?.size,
      color: variant?.color,
      qty: l.qty,
      price: l.price,
      image: (product?.images && product.images[0]) || undefined
    };
  });

  // Payment summary
  const subtotal = items.reduce((s: number, it: any) => s + it.qty * it.price, 0);
  const grand = (order as any).total ?? subtotal;
  const paid = (order as any).paid ?? 0;
  const balance = Math.max(0, grand - paid);

  // primary shipping address (from first shipment)
  const shippingTo = shipments[0]?.to ? shipments[0].to : undefined;

  return { order, shipments, overallStatus: overall, progressPct, items, payments: { subtotal, grand, paid, balance }, shippingTo } as const;
}

