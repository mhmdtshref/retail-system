"use client";
import type { PosCartLine } from '@/lib/pos/types';
import { posDb } from '@/lib/db/posDexie';
import { evaluateTotals, type AppliedDiscount } from './apply';
import type { TaxConfig, CurrencyConfig } from './engine';

export async function evaluateTaxForPos(
  lines: PosCartLine[],
  appliedDiscounts: AppliedDiscount[] | undefined,
  opts?: { paymentMethod?: 'cash'|'card'|'transfer'|'store_credit' }
) {
  const taxConf = await getTaxConfig();
  const curConf = await getCurrencyConfig();
  const skus = lines.map((l) => l.sku);
  const prods = await posDb.products.where('sku').anyOf(skus).toArray();
  const metaBySku: Record<string, { category?: string; brand?: string }> = {};
  for (const p of prods as any[]) {
    metaBySku[p.sku] = { category: (p as any).category, brand: (p as any).brand };
  }
  const cart = { lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, unitPrice: l.price, category: metaBySku[l.sku]?.category, brand: metaBySku[l.sku]?.brand })) };
  return evaluateTotals(cart, appliedDiscounts || [], taxConf, curConf, { paymentMethod: opts?.paymentMethod });
}

async function getTaxConfig(): Promise<TaxConfig> {
  try {
    const row: any = await posDb.taxConfigCache.get('active' as any);
    if (row?.json) return row.json as TaxConfig;
  } catch {}
  // fallback remote
  try {
    const res = await fetch('/api/settings/tax');
    if (res.ok) return (await res.json()) as TaxConfig;
  } catch {}
  return { priceMode: 'tax_exclusive', defaultRate: 0.15, rules: [], precision: 2, roundingStrategy: 'half_up', receiptRounding: 'none', cashRounding: { enabled: true, increment: 0.05 } };
}

async function getCurrencyConfig(): Promise<CurrencyConfig> {
  try {
    const row: any = await posDb.currencyConfigCache.get('active' as any);
    if (row?.json) return row.json as CurrencyConfig;
  } catch {}
  try {
    const res = await fetch('/api/settings/currency');
    if (res.ok) return (await res.json()) as CurrencyConfig;
  } catch {}
  return { defaultCurrency: 'SAR', displayLocale: 'ar-SA', allowFxNote: false } as any;
}
