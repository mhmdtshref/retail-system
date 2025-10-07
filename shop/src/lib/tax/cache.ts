"use client";
import { posDb } from '@/lib/db/posDexie';
import type { TaxConfig } from './engine';
import type { CurrencyConfig } from './engine';

export async function refreshTaxCurrencyConfigs(): Promise<void> {
  try {
    const [taxRes, curRes] = await Promise.all([
      fetch('/api/settings/tax'),
      fetch('/api/settings/currency')
    ]);
    if (taxRes.ok) {
      const tax = await taxRes.json();
      await posDb.taxConfigCache.put({ id: 'active', json: tax, updatedAt: Date.now() });
    }
    if (curRes.ok) {
      const cur = await curRes.json();
      await posDb.currencyConfigCache.put({ id: 'active', json: cur, updatedAt: Date.now() });
    }
  } catch {}
}

export async function refreshSettingsConfig(): Promise<void> {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const doc = await res.json();
      try {
        const { cacheSettings } = await import('@/lib/offline/settings-cache');
        await cacheSettings(doc);
      } catch {}
    }
  } catch {}
}

export async function getCachedTaxConfig(): Promise<TaxConfig> {
  const def: TaxConfig = { priceMode: 'tax_exclusive', defaultRate: 0.15, rules: [], precision: 2, roundingStrategy: 'half_up', receiptRounding: 'none', cashRounding: { enabled: true, increment: 0.05 } };
  try {
    const row: any = await posDb.taxConfigCache.get('active' as any);
    return (row?.json as TaxConfig) || def;
  } catch {
    return def;
  }
}

export async function getCachedCurrencyConfig(): Promise<CurrencyConfig> {
  const def: CurrencyConfig = { defaultCurrency: 'SAR', displayLocale: 'ar-SA', allowFxNote: false } as any;
  try {
    const row: any = await posDb.currencyConfigCache.get('active' as any);
    return (row?.json as CurrencyConfig) || def;
  } catch {
    return def;
  }
}
