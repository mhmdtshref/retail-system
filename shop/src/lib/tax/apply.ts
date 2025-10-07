import { round, roundToIncrement } from './round';
import { computeLine, getItemTaxRate, type TaxConfig, type CurrencyConfig } from './engine';

export type TaxBreakdown = { rate: number; taxable: number; tax: number };
export type Totals = {
  subtotalExclTax: number;
  discounts: number;
  tax: number;
  roundingAdj?: number;
  grandTotal: number;
  taxByRate: TaxBreakdown[];
  priceMode: 'tax_inclusive'|'tax_exclusive';
};

export type CartLine = { sku: string; qty: number; unitPrice: number; category?: string; brand?: string; taxExempt?: boolean; zeroRated?: boolean };
export type AppliedDiscountLine = { sku: string; qty: number; discount: number };
export type AppliedDiscount = { id: string; source: 'promotion'|'coupon'; level: 'line'|'order'; label: string; amount: number; lines?: AppliedDiscountLine[] };

export function evaluateTotals(
  cart: { lines: CartLine[] },
  applied: AppliedDiscount[] | undefined,
  taxConfig: TaxConfig,
  currency: CurrencyConfig,
  opts?: { paymentMethod?: 'cash'|'card'|'transfer'|'store_credit' }
): { totals: Totals; perLine: Array<{ sku: string; qty: number; net: number; tax: number; gross: number; rate: number }>; } {
  const lines = cart.lines || [];
  const decimals = Math.max(0, taxConfig.precision ?? 2);
  const rounding = taxConfig.roundingStrategy || 'half_up';
  const perLineDiscountMap: Record<string, number> = {};
  const orderLevelDiscount = (applied||[]).filter(a=>a.level==='order').reduce((s,a)=> s + (a.amount||0), 0);
  const lineLevelBySku: Record<string, number> = {};
  for (const a of (applied||[])) {
    if (a.level === 'line' && a.lines && a.lines.length) {
      for (const l of a.lines) {
        lineLevelBySku[l.sku] = (lineLevelBySku[l.sku] || 0) + (l.discount || 0);
      }
    }
  }
  // Pro-rate order discount by line base share
  const baseTotals = lines.reduce((s,l)=> s + l.qty * l.unitPrice, 0);
  for (const l of lines) {
    const base = l.qty * l.unitPrice;
    const share = baseTotals > 0 ? orderLevelDiscount * (base / baseTotals) : 0;
    perLineDiscountMap[l.sku] = (lineLevelBySku[l.sku] || 0) + share;
  }

  const rawPerLine: Array<{ sku: string; qty: number; net: number; tax: number; gross: number; rate: number; taxRemainder?: number; netRemainder?: number }>=[];
  const taxByRate: Record<number, { taxable: number; tax: number; taxRemainders: number[] }>= {};

  for (const l of lines) {
    const lineDiscount = Math.min(l.qty * l.unitPrice, perLineDiscountMap[l.sku] || 0);
    const rate = getItemTaxRate({ sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, lineDiscount, taxExempt: l.taxExempt, zeroRated: l.zeroRated }, taxConfig, { category: l.category, brand: l.brand });
    const { net, tax, gross, rate: r } = computeLine({ sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, lineDiscount, taxExempt: l.taxExempt, zeroRated: l.zeroRated }, rate, taxConfig);
    rawPerLine.push({ sku: l.sku, qty: l.qty, net, tax, gross, rate: r });
    const rb = taxByRate[r] || { taxable: 0, tax: 0, taxRemainders: [] };
    rb.taxable += net;
    rb.tax += tax;
    rb.taxRemainders.push(tax - Math.floor(tax * Math.pow(10, decimals)) / Math.pow(10, decimals));
    taxByRate[r] = rb;
  }

  let subtotalExclTaxRaw = rawPerLine.reduce((s, li)=> s + li.net, 0);
  let taxRaw = rawPerLine.reduce((s, li)=> s + li.tax, 0);

  // Receipt-level rounding/penny balancing
  const perLine = rawPerLine.slice();
  if (taxConfig.receiptRounding && taxConfig.receiptRounding !== 'none') {
    // sum raw then round totals, adjust largest remainder line
    const roundedTax = round(taxRaw, decimals, taxConfig.receiptRounding);
    const roundedNet = round(subtotalExclTaxRaw, decimals, taxConfig.receiptRounding);
    const taxDiff = Number((roundedTax - taxRaw).toFixed(decimals));
    if (Math.abs(taxDiff) >= Math.pow(10, -decimals)) {
      // assign to line with largest fractional remainder in tax
      let idx = 0; let maxRem = -Infinity;
      perLine.forEach((li, i) => {
        const rem = li.tax - Math.floor(li.tax * Math.pow(10, decimals)) / Math.pow(10, decimals);
        if (rem > maxRem) { maxRem = rem; idx = i; }
      });
      perLine[idx] = { ...perLine[idx], tax: perLine[idx].tax + taxDiff, gross: perLine[idx].gross + taxDiff };
    }
    taxRaw = roundedTax;
    subtotalExclTaxRaw = roundedNet;
  } else {
    // line-level rounding already applied in computeLine
    // Ensure totals are rounded consistently
    taxRaw = round(taxRaw, decimals, rounding);
    subtotalExclTaxRaw = round(subtotalExclTaxRaw, decimals, rounding);
  }

  const discounts = (applied||[]).reduce((s,a)=> s + (a.amount||0), 0);
  const grandBeforeCash = round(subtotalExclTaxRaw + taxRaw, decimals, rounding);

  let roundingAdj = 0;
  let grandTotal = grandBeforeCash;
  if (opts?.paymentMethod === 'cash' && taxConfig.cashRounding?.enabled && taxConfig.cashRounding.increment) {
    const { rounded, adj } = roundToIncrement(grandBeforeCash, taxConfig.cashRounding.increment);
    grandTotal = rounded;
    roundingAdj = adj;
  }

  const taxByRateArr: TaxBreakdown[] = Object.entries(taxByRate).map(([rateStr, v]) => ({ rate: Number(rateStr), taxable: round(v.taxable, decimals, rounding), tax: round(v.tax, decimals, rounding) }))
    .sort((a,b)=> a.rate - b.rate);

  const totals: Totals = {
    subtotalExclTax: subtotalExclTaxRaw,
    discounts,
    tax: taxRaw,
    roundingAdj: roundingAdj || undefined,
    grandTotal,
    taxByRate: taxByRateArr,
    priceMode: taxConfig.priceMode
  };

  return { totals, perLine };
}
