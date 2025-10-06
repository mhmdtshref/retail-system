import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Promotion } from '@/lib/models/Promotion';
import { Product } from '@/lib/models/Product';
import { evaluate } from '@/lib/discounts/engine';
import type { CartInput, EvaluateContext, PromotionRule, CouponRule } from '@/lib/discounts/types';
import { getCouponRuleByCode } from '@/lib/discounts/coupons';

const ReqSchema = z.object({
  cart: z.object({
    lines: z.array(z.object({ sku: z.string(), qty: z.number().int().positive(), unitPrice: z.number().nonnegative() })),
    subtotal: z.number().nonnegative()
  }),
  customerId: z.string().optional(),
  customerGroups: z.array(z.string()).optional(),
  channel: z.enum(['retail','online']).default('retail'),
  couponCode: z.string().optional(),
  stackingPolicy: z.enum(['none','coupons_only','promos_only','allow_both']).default('allow_both')
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { cart, customerId, customerGroups, channel, couponCode, stackingPolicy } = parsed.data;
  await dbConnect();
  // Enrich with category/brand
  const skus = cart.lines.map(l => l.sku);
  const prods = await Product.find({ 'variants.sku': { $in: skus } }).lean();
  const skuToMeta: Record<string, { category?: string; brand?: string }> = {};
  for (const p of prods as any[]) {
    for (const v of (p.variants || [])) {
      skuToMeta[v.sku] = { category: p.category, brand: p.brand };
    }
  }
  const cartEnriched: CartInput = {
    lines: cart.lines.map(l => ({ ...l, category: skuToMeta[l.sku]?.category, brand: skuToMeta[l.sku]?.brand })),
    subtotal: cart.subtotal
  };
  const promosDocs: any[] = await Promotion.find({ active: true }).sort({ priority: 1 }).lean();
  const promotions: PromotionRule[] = promosDocs.map((d: any) => ({
    _id: String(d._id), name: d.name, code: d.code, type: d.type, level: d.level, value: d.value, x: d.x, y: d.y, yDiscount: d.yDiscount,
    scope: d.scope, constraints: d.constraints, schedule: d.schedule, stacking: d.stacking, priority: d.priority, active: d.active
  }));
  let coupon: CouponRule | null = null;
  if (couponCode) coupon = await getCouponRuleByCode(couponCode);
  const ctx: EvaluateContext & { promotions: PromotionRule[]; coupon?: CouponRule | null } = {
    channel, customerId, customerGroups, firstPurchase: false, stackingPolicy, promotions, coupon: coupon || undefined
  };
  const res = evaluate(cartEnriched, ctx);
  return NextResponse.json(res);
}
