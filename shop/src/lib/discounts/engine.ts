import { AppliedDiscount, CartInput, CartLine, EvaluateContext, EvaluateResult, PromotionRule, CouponRule, StackingPolicy } from './types';
import { clamp, isLineInScope, pickCheapest } from './utils';

function percent(amount: number, p: number) { return (amount * clamp(p, 0, 100)) / 100; }

function withinSchedule(now: Date, rule: PromotionRule | CouponRule): boolean {
  const s: any = (rule as any).schedule;
  if (!s) return true;
  const ts = now.getTime();
  if (s.startsAt && ts < Date.parse(s.startsAt)) return false;
  if (s.endsAt && ts > Date.parse(s.endsAt)) return false;
  if (s.daysOfWeek && s.daysOfWeek.length > 0) {
    const dow = now.getDay();
    if (!s.daysOfWeek.includes(dow)) return false;
  }
  if (s.startTime || s.endTime) {
    const [h, m] = (s.startTime || '00:00').split(':').map(Number);
    const [he, me] = (s.endTime || '23:59').split(':').map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const startM = (h || 0) * 60 + (m || 0);
    const endM = (he || 23) * 60 + (me || 59);
    if (mins < startM || mins > endM) return false;
  }
  return true;
}

function evaluatePromotion(cart: CartInput, ctx: EvaluateContext, promo: PromotionRule): AppliedDiscount | null {
  if (!promo.active) return null;
  if (!withinSchedule(new Date(ctx.now || Date.now()), promo)) return null;
  if (promo.scope?.channel && !promo.scope.channel.includes(ctx.channel)) return null;
  if (promo.constraints?.minSubtotal && cart.subtotal < promo.constraints.minSubtotal) return null;
  if (promo.constraints?.firstPurchaseOnly && !ctx.firstPurchase) return null;

  const eligibleLines = cart.lines.filter(l => isLineInScope(l, promo.scope));
  if (eligibleLines.length === 0) return null;

  let amount = 0;
  let lines: AppliedDiscount['lines'] | undefined;

  if (promo.type === 'percent') {
    if (promo.level === 'order') {
      amount = percent(cart.subtotal, promo.value || 0);
    } else {
      const subEligible = eligibleLines.reduce((s,l) => s + l.qty * l.unitPrice, 0);
      amount = percent(subEligible, promo.value || 0);
      lines = eligibleLines.map(l => ({ sku: l.sku, qty: l.qty, discount: percent(l.qty * l.unitPrice, promo.value || 0) }));
    }
  } else if (promo.type === 'amount') {
    if (promo.level === 'order') {
      amount = Math.min(promo.value || 0, cart.subtotal);
    } else {
      const subEligible = eligibleLines.reduce((s,l) => s + l.qty * l.unitPrice, 0);
      amount = Math.min(promo.value || 0, subEligible);
    }
  } else if (promo.type === 'threshold') {
    if (cart.subtotal >= (promo.value || 0)) {
      // Interpret threshold.value as percent when level=order
      amount = percent(cart.subtotal, promo.yDiscount || 0);
    }
  } else if (promo.type === 'bogo') {
    const x = promo.x || 0;
    const y = promo.y || 0;
    const totalQty = eligibleLines.reduce((s,l) => s + l.qty, 0);
    if (x > 0 && y > 0 && totalQty >= x + y) {
      const groups = Math.floor(totalQty / (x + y));
      const yQtyTotal = groups * y;
      const expanded: CartLine[] = [];
      for (const l of eligibleLines) {
        for (let i=0;i<l.qty;i++) expanded.push({ ...l, qty: 1 });
      }
      const yItems = pickCheapest(expanded, yQtyTotal);
      const yDisc = promo.yDiscount == null ? 100 : promo.yDiscount;
      amount = yItems.reduce((s, li) => s + percent(li.unitPrice, yDisc), 0);
      const linesAgg: Record<string, { qty: number; discount: number }> = {};
      for (const item of yItems) {
        const add = percent(item.unitPrice, yDisc);
        if (!linesAgg[item.sku]) linesAgg[item.sku] = { qty: 0, discount: 0 };
        linesAgg[item.sku].qty += 1;
        linesAgg[item.sku].discount += add;
      }
      lines = Object.entries(linesAgg).map(([sku, v]) => ({ sku, qty: v.qty, discount: v.discount }));
    }
  }

  if (amount <= 0) return null;
  if (promo.constraints?.maxDiscount != null) amount = Math.min(amount, promo.constraints.maxDiscount);

  return { id: promo._id, source: 'promotion', level: promo.level, label: promo.name, amount, lines, traceId: `promo:${promo._id}` };
}

function evaluateCoupon(cart: CartInput, ctx: EvaluateContext, coupon: CouponRule): AppliedDiscount | null {
  if (coupon.active === false) return null;
  if ((coupon as any).schedule && !withinSchedule(new Date(ctx.now || Date.now()), coupon)) return null;
  if (coupon.scope?.channel && !coupon.scope.channel.includes(ctx.channel)) return null;
  if (coupon.constraints?.minSubtotal && cart.subtotal < coupon.constraints.minSubtotal) return null;
  const eligibleLines = cart.lines.filter(l => isLineInScope(l, coupon.scope));
  if (eligibleLines.length === 0) return null;

  let amount = 0;
  if (coupon.type === 'percent') amount = percent(cart.subtotal, coupon.value);
  if (coupon.type === 'amount') amount = Math.min(coupon.value, cart.subtotal);
  if (coupon.constraints?.maxDiscount != null) amount = Math.min(amount, coupon.constraints.maxDiscount);
  if (amount <= 0) return null;

  return { id: coupon.code, source: 'coupon', level: 'order', label: coupon.name || coupon.code, amount, traceId: `coupon:${coupon.code}` };
}

function pickBest(applied: AppliedDiscount[], policy: StackingPolicy): AppliedDiscount[] {
  if (applied.length === 0) return [];
  if (policy === 'none') {
    // Pick the single best benefit
    const best = applied.slice().sort((a,b) => b.amount - a.amount)[0];
    return best ? [best] : [];
  }
  if (policy === 'promos_only') {
    const promos = applied.filter(a => a.source === 'promotion');
    const best = promos.slice().sort((a,b) => b.amount - a.amount)[0];
    return best ? [best] : [];
  }
  if (policy === 'coupons_only') {
    const coupons = applied.filter(a => a.source === 'coupon');
    const best = coupons.slice().sort((a,b) => b.amount - a.amount)[0];
    return best ? [best] : [];
  }
  // allow_both: naive stacking but avoid double-discounting same line by preferring order-level + then line-level that do not exceed subtotal
  const orderLevel = applied.filter(a => a.level === 'order').sort((a,b) => b.amount - a.amount);
  const lineLevel = applied.filter(a => a.level === 'line').sort((a,b) => b.amount - a.amount);
  const picks: AppliedDiscount[] = [];
  if (orderLevel[0]) picks.push(orderLevel[0]);
  for (const l of lineLevel) {
    picks.push(l);
  }
  return picks;
}

export function evaluate(cart: CartInput, context: EvaluateContext & { promotions?: PromotionRule[]; coupon?: CouponRule | null }): EvaluateResult {
  const explain: any = process.env.NODE_ENV !== 'production' ? { candidates: [] as any[] } : undefined;
  const appliedCandidates: AppliedDiscount[] = [];

  for (const promo of (context.promotions || []).sort((a,b) => a.priority - b.priority)) {
    const res = evaluatePromotion(cart, context, promo);
    if (res) {
      appliedCandidates.push(res);
      if (explain) explain.candidates.push({ type: 'promotion', id: promo._id, amount: res.amount });
    }
  }

  if (context.coupon) {
    const cRes = evaluateCoupon(cart, context, context.coupon);
    if (cRes) {
      appliedCandidates.push(cRes);
      if (explain) explain.candidates.push({ type: 'coupon', code: context.coupon.code, amount: cRes.amount });
    }
  }

  const winners = pickBest(appliedCandidates, context.stackingPolicy);
  const discounts = winners.reduce((s,a) => s + a.amount, 0);
  const grandTotal = Math.max(0, cart.subtotal - discounts);
  const result: EvaluateResult = { applied: winners, totals: { subtotal: cart.subtotal, discounts, grandTotal }, explain };
  return result;
}
