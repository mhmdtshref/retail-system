export type PromoType = 'percent'|'amount'|'bogo'|'threshold';
export type PromoLevel = 'order'|'line';
export type PromoStacking = 'inherit'|'none'|'order_only'|'line_only'|'allow';
export type StackingPolicy = 'none' | 'coupons_only' | 'promos_only' | 'allow_both';

export type CartLine = { sku: string; qty: number; unitPrice: number; category?: string; brand?: string };
export type CartInput = { lines: CartLine[]; subtotal: number };

export type RuleScope = {
  include?: { categories?: string[]; brands?: string[]; skus?: string[] };
  exclude?: { categories?: string[]; brands?: string[]; skus?: string[] };
  channel?: Array<'retail'|'online'>;
  customerGroups?: string[];
};

export type PromotionRule = {
  _id: string;
  name: string;
  code?: string;
  type: PromoType;
  level: PromoLevel;
  value?: number;
  x?: number; y?: number; yDiscount?: number;
  scope?: RuleScope;
  constraints?: {
    minSubtotal?: number;
    maxDiscount?: number;
    perOrderLimit?: number;
    perCustomerLimit?: number;
    globalLimit?: number;
    firstPurchaseOnly?: boolean;
  };
  schedule?: { startsAt?: string; endsAt?: string; daysOfWeek?: number[]; startTime?: string; endTime?: string };
  stacking?: PromoStacking;
  priority: number;
  active: boolean;
};

export type CouponRule = {
  code: string;
  name?: string;
  type: 'percent'|'amount';
  value: number;
  scope?: RuleScope;
  constraints?: {
    minSubtotal?: number;
    perCustomerLimit?: number;
    perCodeLimit?: number;
    globalLimit?: number;
    maxDiscount?: number;
    stackable?: boolean;
  };
  expiresAt?: string;
  active?: boolean;
};

export type AppliedDiscountLine = { sku: string; qty: number; discount: number };
export type AppliedDiscount = {
  id: string; source: 'promotion'|'coupon'; level: 'line'|'order';
  label: string; amount: number;
  lines?: AppliedDiscountLine[];
  traceId?: string;
};

export type EvaluateContext = {
  channel: 'retail'|'online';
  customerId?: string;
  customerGroups?: string[];
  firstPurchase?: boolean;
  stackingPolicy: StackingPolicy;
  now?: number;
};

export type EvaluateResult = {
  applied: AppliedDiscount[];
  totals: { subtotal: number; discounts: number; grandTotal: number };
  explain?: any;
};
