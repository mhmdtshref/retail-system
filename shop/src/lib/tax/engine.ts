import { round } from './round';

export type TaxRule = {
  id: string;
  name: string;
  rate: number; // 0.15 for 15%
  scope?: { categories?: string[]; brands?: string[]; skus?: string[] };
  zeroRated?: boolean;
  exempt?: boolean;
  active: boolean;
};

export type TaxConfig = {
  priceMode: 'tax_inclusive' | 'tax_exclusive';
  defaultRate: number; // e.g., 0.15
  rules: TaxRule[];
  precision: number; // decimals for line calcs
  roundingStrategy: 'half_up' | 'bankers';
  receiptRounding?: 'none' | 'half_up' | 'bankers';
  cashRounding?: { enabled: boolean; increment: 0.05 | 0.1 };
};

export type CurrencyConfig = {
  defaultCurrency: string; // 'SAR' | 'AED' | 'EGP' | ...
  displayLocale: string; // 'ar-SA' etc.
  allowFxNote?: boolean;
};

export type ProductMeta = { category?: string; brand?: string } | undefined;
export type ItemInput = { sku: string; qty: number; unitPrice: number; lineDiscount?: number; taxExempt?: boolean; zeroRated?: boolean; };

export function getItemTaxRate(item: ItemInput, taxConfig: TaxConfig, productMeta?: ProductMeta): number | 'exempt' {
  if (item.taxExempt) return 'exempt';
  if (item.zeroRated) return 0;
  for (const r of (taxConfig.rules || [])) {
    if (!r.active) continue;
    if (r.exempt) {
      const inScope = isInScope(item, productMeta, r.scope);
      if (inScope) return 'exempt';
    }
    if (r.zeroRated) {
      const inScope = isInScope(item, productMeta, r.scope);
      if (inScope) return 0;
    }
    if (isInScope(item, productMeta, r.scope)) return Math.max(0, r.rate);
  }
  return Math.max(0, taxConfig.defaultRate || 0);
}

function isInScope(item: ItemInput, meta: ProductMeta, scope?: { categories?: string[]; brands?: string[]; skus?: string[] }): boolean {
  if (!scope) return false;
  if (scope.skus && scope.skus.includes(item.sku)) return true;
  if (scope.categories && meta?.category && scope.categories.includes(meta.category)) return true;
  if (scope.brands && meta?.brand && scope.brands.includes(meta.brand)) return true;
  return false;
}

export function computeLine(item: ItemInput, rateIn: number | 'exempt', taxConfig: TaxConfig): { net: number; tax: number; gross: number; rate: number } {
  const decimals = Math.max(0, taxConfig.precision ?? 2);
  const rounding = taxConfig.roundingStrategy || 'half_up';
  const rate = rateIn === 'exempt' ? 0 : Math.max(0, rateIn || 0);
  const qty = Math.max(0, item.qty || 0);
  const base = Math.max(0, qty * (item.unitPrice || 0) - Math.max(0, item.lineDiscount || 0));

  if (taxConfig.priceMode === 'tax_inclusive') {
    const divisor = 1 + rate;
    const rawNet = divisor === 0 ? base : base / divisor;
    const rawTax = base - rawNet;
    if (taxConfig.receiptRounding === 'none') {
      // line rounding
      const net = round(rawNet, decimals, rounding);
      const tax = round(rawTax, decimals, rounding);
      const gross = round(net + tax, decimals, rounding);
      return { net, tax, gross, rate };
    }
    // defer to receipt-level: keep full precision; caller will round
    return { net: rawNet, tax: rawTax, gross: base, rate };
  } else {
    // tax_exclusive
    const rawNet = base;
    const rawTax = rawNet * rate;
    if (taxConfig.receiptRounding === 'none') {
      const net = round(rawNet, decimals, rounding);
      const tax = round(rawTax, decimals, rounding);
      const gross = round(net + tax, decimals, rounding);
      return { net, tax, gross, rate };
    }
    return { net: rawNet, tax: rawTax, gross: rawNet + rawTax, rate };
  }
}
