"use client";
import { posDb } from '@/lib/db/posDexie';
import type { PosCartLine } from '@/lib/pos/types';
import { evaluate } from './engine';
import type { PromotionRule, CouponRule, CartInput, EvaluateContext } from './types';
import type { Discount } from '@/lib/pos/types';

export async function evaluateLocalForPos(
  lines: PosCartLine[],
  couponCode: string | null,
  stackingPolicy: 'none'|'coupons_only'|'promos_only'|'allow_both' = 'allow_both',
  manualDiscount?: Discount | null
) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  // Join with product meta for scope matching
  const skus = lines.map((l) => l.sku);
  const prods = await posDb.products.where('sku').anyOf(skus).toArray();
  const skuMeta: Record<string, { category?: string; brand?: string }> = {};
  for (const p of prods as any[]) {
    skuMeta[p.sku] = { category: (p as any).category, brand: (p as any).brand };
  }
  const cart: CartInput = {
    lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, unitPrice: l.price, category: skuMeta[l.sku]?.category, brand: skuMeta[l.sku]?.brand })),
    subtotal
  };
  const promosRaw = await posDb.promotionsActive.toArray();
  const promotions: PromotionRule[] = promosRaw.map((r: any) => r.ruleJson);
  let coupon: CouponRule | null = null;
  if (couponCode) {
    const idx = await posDb.couponsIndex.get({ codeLower: couponCode.toLowerCase() } as any);
    if (idx && (!idx.expiresAt || Date.now() <= Date.parse(idx.expiresAt))) {
      coupon = { code: couponCode, name: couponCode, type: idx.policyJson?.type || 'amount', value: idx.policyJson?.value || 0, constraints: idx.policyJson?.constraints, active: true } as any;
    }
  }
  const ctx: EvaluateContext & { promotions: PromotionRule[]; coupon?: CouponRule | null } = {
    channel: 'retail', stackingPolicy, promotions, coupon: coupon || undefined
  } as any;
  const res = evaluate(cart, ctx);
  // Optionally add manual discount as a pseudo-applied item (manager override)
  if (manualDiscount) {
    const manualAmount = manualDiscount.type === 'percent' ? (subtotal * Math.min(100, Math.max(0, manualDiscount.value))) / 100 : Math.min(Math.max(0, manualDiscount.value), subtotal);
    if (manualAmount > 0) {
      res.applied.push({ id: 'manual', source: 'promotion', level: 'order', label: 'خصم يدوي', amount: manualAmount, traceId: 'manual' });
      const discounts = res.applied.reduce((s, a) => s + a.amount, 0);
      res.totals.discounts = discounts;
      res.totals.grandTotal = Math.max(0, subtotal - discounts);
    }
  }
  return res;
}
