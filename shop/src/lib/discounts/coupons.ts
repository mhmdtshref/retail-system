import { Coupon } from '@/lib/models/Coupon';
import { dbConnect } from '@/lib/db/mongo';
import { getIfExists, saveResult } from '@/lib/idempotency';
import type { CartInput, EvaluateContext, CouponRule } from './types';

export async function getCouponRuleByCode(code: string): Promise<CouponRule | null> {
  await dbConnect();
  const doc: any = await Coupon.findOne({ code: new RegExp(`^${code}$`, 'i'), active: true }).lean();
  if (!doc) return null;
  return {
    code: doc.code,
    name: doc.name,
    type: doc.type,
    value: doc.value,
    scope: doc.scope,
    constraints: doc.constraints,
    expiresAt: doc.expiresAt,
    active: doc.active,
  };
}

export async function validateCoupon(code: string, cart: CartInput, context: EvaluateContext) {
  const rule = await getCouponRuleByCode(code);
  if (!rule) return { valid: false, reason: 'INVALID' } as const;
  const now = Date.now();
  if (rule.expiresAt && now > Date.parse(rule.expiresAt)) return { valid: false, reason: 'EXPIRED' } as const;
  return { valid: true, rule } as const;
}

export async function redeemCoupon(input: { code: string; saleId: string; customerId?: string; idempotencyKey: string }) {
  await dbConnect();
  const cached = await getIfExists<any>(input.idempotencyKey);
  if (cached) return cached;
  const doc: any = await Coupon.findOne({ code: new RegExp(`^${input.code}$`, 'i'), active: true });
  if (!doc) throw new Error('COUPON_NOT_FOUND');
  // Basic usage caps enforcement (global)
  const perCode = doc?.constraints?.perCodeLimit;
  const globalLimit = doc?.constraints?.globalLimit;
  if (globalLimit != null && doc.usage?.globalUsed >= globalLimit) throw new Error('COUPON_GLOBAL_LIMIT');
  // For demo, we increment globalUsed atomically
  doc.usage = doc.usage || { globalUsed: 0 };
  doc.usage.globalUsed += 1;
  await doc.save();
  const snapshot = { code: doc.code, type: doc.type, value: doc.value, constraints: doc.constraints };
  await saveResult(input.idempotencyKey, snapshot);
  return snapshot;
}
