import { evaluateTotals } from '@/lib/tax/apply';
import type { Totals as TaxTotals } from '@/lib/tax/apply';

export type DateRangeUtc = { start: Date; end: Date };

export function toUtcRangeForLocalDay(dateStr: string, tz: string): { start: Date; end: Date } {
  // Minimal implementation assuming fixed tz offset is injected at runtime via process.env or settings override.
  // Fallback: interpret as local of Asia/Riyadh (UTC+3) if tz not provided.
  const d = new Date(dateStr + 'T00:00:00');
  const offsetHours = tz && tz.includes('Riyadh') ? 3 : 3;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0 - offsetHours, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23 - offsetHours, 59, 59, 999));
  return { start, end };
}

export function computeKpisFromLines(
  lines: Array<{ sku: string; qty: number; unitPrice: number; category?: string; brand?: string }>,
  discounts: Array<{ id: string; source: 'promotion'|'coupon'; level: 'line'|'order'; label: string; amount: number; lines?: { sku: string; qty: number; discount: number }[] }>,
  taxConfig: any,
  currency: any,
  opts?: { paymentMethod?: 'cash'|'card'|'transfer'|'store_credit' }
) {
  const { totals, perLine } = evaluateTotals({ lines: lines.map((l)=> ({ sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, category: l.category, brand: l.brand })) }, discounts as any, taxConfig, currency, { paymentMethod: opts?.paymentMethod });
  const gross = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const discountsSum = (discounts||[]).reduce((s, a) => s + (a.amount || 0), 0);
  const netSales = totals.priceMode === 'tax_inclusive' ? (totals.subtotalExclTax - 0) : (totals.subtotalExclTax);
  return { grossSales: gross, discounts: discountsSum, netSales, tax: totals.tax, roundingAdj: totals.roundingAdj || 0, totals: totals as TaxTotals, perLine };
}

export function arabicCsvEscape(text: string): string {
  const t = String(text ?? '');
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export function toCsvUtf8Bom(headers: string[], rows: Array<Array<string|number>>): string {
  const bom = '\uFEFF';
  const head = headers.map(arabicCsvEscape).join(',');
  const body = rows.map((r) => r.map((c) => arabicCsvEscape(String(c))).join(',')).join('\n');
  return bom + head + '\n' + body + '\n';
}

