import { dbConnect } from '@/lib/db/mongo';
import { DailySnapshot } from '@/lib/models/DailySnapshot';
import { getSettings } from '@/lib/settings';
import { mockDb } from '@/lib/mock/store';
import { toUtcRangeForLocalDay, toCsvUtf8Bom } from './math';

export type DailyFilters = { from: string; to: string; channel?: 'retail'|'online'; cashier?: string; payment?: 'cash'|'card'|'transfer'|'store_credit'|'cod' };

export async function getDailyReport(filters: DailyFilters) {
  const settings = await getSettings();
  const tz = settings?.locales?.timezone || 'Asia/Riyadh';
  await dbConnect().catch(()=>{});

  // Aggregate from mock store for now
  const fromDate = new Date(filters.from);
  const toDate = new Date(filters.to);
  const dateFrom = fromDate.getTime();
  const dateTo = toDate.getTime();

  const sales = mockDb.listSales({ dateFrom, dateTo });
  const returns = mockDb.listReturns({ dateFrom, dateTo });
  const payments = Array.from((mockDb as any).listRefunds ? [] : []);

  let invoices = 0; let items = 0; let grossSales = 0; let discounts = 0; let returnsValue = 0; let netSales = 0; let tax = 0; let roundingAdj = 0; let shipping = 0; let cogs = 0; let margin = 0; let marginPct = 0;
  const payMap: Record<'cash'|'card'|'transfer'|'store_credit'|'cod', number> = { cash: 0, card: 0, transfer: 0, store_credit: 0, cod: 0 };

  for (const s of sales) {
    invoices++;
    const saleGross = (s.lines || []).reduce((sum, l) => sum + l.qty * l.price, 0);
    grossSales += saleGross;
    items += (s.lines || []).reduce((sum, l) => sum + l.qty, 0);
    const saleDiscounts = 0; // unknown at mock level unless provided; zero
    discounts += saleDiscounts;
    // tax saved earlier into sale.tax by POS flow
    tax += Number((s as any).tax || 0);
    netSales += (s.total || 0);
  }
  for (const r of returns) {
    returnsValue += (r.lines || []).reduce((sum: number, l: any) => sum + (l.qty * l.unitPrice), 0);
  }

  // Payments breakdown from mock payments map
  try {
    const pmMap: Map<string, any> | undefined = (mockDb as any)?.payments;
    const allPayments: any[] = pmMap ? Array.from(pmMap.values()) : [];
    for (const p of allPayments) {
      const receivedAt: number = Number(p.receivedAt || 0);
      if (receivedAt >= dateFrom && receivedAt <= dateTo) {
        const method: string = p.method === 'cod_remit' ? 'cod' : String(p.method || '');
        const key = method as keyof typeof payMap;
        if (key in payMap) payMap[key] += Number(p.amount || 0);
      }
    }
  } catch {}

  const netAfterReturns = Math.max(0, netSales - returnsValue);
  const marginAbs = netAfterReturns - cogs;
  const marginPctCalc = netAfterReturns > 0 ? (marginAbs / netAfterReturns) * 100 : 0;
  margin = marginAbs; marginPct = marginPctCalc;

  const counters = { invoices, items, grossSales, discounts, returns: returnsValue, netSales: netAfterReturns, tax, roundingAdj, shipping, cogs, margin, marginPct };
  // Simple series by hour
  const byHour: Record<string, number> = {};
  for (const s of sales) {
    const d = new Date(s.createdAt || Date.now());
    const h = String(d.getHours()).padStart(2, '0');
    byHour[h] = (byHour[h] || 0) + (s.total || 0);
  }
  const salesByTime = Object.keys(byHour).sort().map((h) => ({ t: h, amount: byHour[h] }));
  // Returns summary with reasons
  const reasons: Record<string, { count: number; value: number }> = {};
  for (const r of returns as any[]) {
    for (const l of (r.lines || [])) {
      const key = String(l.reason || 'other');
      const val = (l.qty || 0) * (l.unitPrice || 0);
      const obj = reasons[key] || { count: 0, value: 0 };
      obj.count += 1; obj.value += val; reasons[key] = obj;
    }
  }
  const returnsSummary = Object.entries(reasons).map(([reason, v]) => ({ reason, count: v.count, value: v.value })).sort((a,b)=> b.value - a.value);
  const top = { products: [], categories: [], brands: [], promos: [] } as any;
  const drawer = undefined;

  return { tz, counters, payments: payMap, drawer, top, charts: { salesByTime, payments: Object.entries(payMap).map(([k,v])=> ({ method: k, amount: v })) }, tables: { returnsSummary } } as const;
}

export function formatDailyCsvArabic(data: Awaited<ReturnType<typeof getDailyReport>>): string {
  const headers = ['البند','القيمة'];
  const rows: Array<Array<string|number>> = [
    ['الفواتير', data.counters.invoices],
    ['العناصر', data.counters.items],
    ['إجمالي المبيعات', data.counters.grossSales.toFixed(2)],
    ['الخصومات', data.counters.discounts.toFixed(2)],
    ['المردودات', data.counters.returns.toFixed(2)],
    ['صافي المبيعات', data.counters.netSales.toFixed(2)],
    ['الضريبة', data.counters.tax.toFixed(2)],
    ['التقريب', (data.counters.roundingAdj||0).toFixed(2)],
    ['الشحن', (data.counters.shipping||0).toFixed(2)],
    ['COGS', data.counters.cogs.toFixed(2)],
    ['هامش الربح', data.counters.margin.toFixed(2)],
    ['٪الهامش', data.counters.marginPct.toFixed(2)]
  ];
  return toCsvUtf8Bom(headers, rows);
}

