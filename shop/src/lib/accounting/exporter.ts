import { getSettings } from '@/lib/settings';
import { mockDb } from '@/lib/mock/store';
import { balanceLines, type JournalLine, round2 } from './balancer';
import { computeFIFOAsOf } from '@/lib/reports/valuation/fifo';
import { computeWeightedAverageAsOf } from '@/lib/reports/valuation/wavg';

export type ExportParams = {
  from: string; // yyyy-mm-dd
  to: string;   // yyyy-mm-dd
  profile: 'generic_csv'|'quickbooks_csv'|'xero_csv';
  consolidation: 'daily_summary'|'per_receipt';
  dateBasis: 'order_date'|'payment_date';
  tz: string;
  baseCurrency: string;
};

export type NormalizedJournal = { lines: JournalLine[]; totals: { debit: number; credit: number; roundingAdj: number; sales: number; tax: number; payments: number; cogs: number } };

export async function buildNormalizedJournal(params: ExportParams): Promise<NormalizedJournal> {
  const settings = await getSettings();
  const accounts = (settings as any).accounting?.accounts || ({} as any);
  // Temporary: if top-level accounting settings model is not wired yet, expect API to provide account map instead.
  const roundingAcc = accounts.rounding || 'Rounding';

  const fromTs = Date.parse(params.from + 'T00:00:00');
  const toTs = Date.parse(params.to + 'T23:59:59.999');

  const receiptScope = params.consolidation === 'per_receipt';
  const lines: JournalLine[] = [];
  let lineNo = 1;
  let totalSales = 0; let totalTax = 0; let totalPayments = 0; const totalCogs = 0;

  // Sales and returns from mockDb; replace with real DB in production.
  const sales = mockDb.listSales({ dateFrom: fromTs, dateTo: toTs });
  const returns = mockDb.listReturns({ dateFrom: fromTs, dateTo: toTs }) as any[];

  // Payments basis
  const paymentsAll: Array<{ method: string; amount: number; receivedAt?: number; saleId?: string }> = Array.from((mockDb as any).payments?.values?.() || [] as any);

  function pushLine(account: string, debit: number, credit: number, memo: string, entity?: string, reference?: string) {
    lines.push({ date: params.from, journalNo: '', lineNo: lineNo++, account, debit: round2(debit), credit: round2(credit), memo, entity, reference, currency: params.baseCurrency });
  }

  if (!receiptScope) {
    const grossSales = sales.reduce((s, sale: any) => s + (sale.total || 0), 0);
    const returnsVal = returns.reduce((s, r: any) => s + (r.lines || []).reduce((ss: number, l: any) => ss + (l.qty * l.unitPrice), 0), 0);
    const discounts = 0; // mock has no explicit discounts
    const netRevenue = Math.max(0, grossSales - discounts);
    const tax = sales.reduce((s, sale: any) => s + Number(sale.tax || 0), 0);
    totalSales = netRevenue - returnsVal; totalTax = tax;
    // Revenue: credit sales; debit discounts
    if (netRevenue > 0) pushLine(accounts.sales || 'Sales', 0, netRevenue, 'Revenue');
    if (discounts > 0) pushLine(accounts.discounts || 'Discounts', discounts, 0, 'Discounts total');
    if (returnsVal > 0) pushLine(accounts.returns || 'Returns', returnsVal, 0, 'Returns');
    if (tax > 0) pushLine(accounts.taxPayable || 'Tax Payable', 0, tax, 'Tax payable');

    // Payments by method
    const payMap: Record<string, number> = { cash: 0, card: 0, transfer: 0, cod: 0, store_credit: 0 };
    for (const p of paymentsAll) {
      const method = (p.method === 'cod_remit') ? 'cod' : String(p.method || '');
      if (params.dateBasis === 'payment_date') {
        if (typeof p.receivedAt === 'number' && p.receivedAt >= fromTs && p.receivedAt <= toTs) {
          if (method in payMap) payMap[method] += Number(p.amount || 0);
        }
      } else {
        // order_date basis: approximate by sale total as paid
        if (method in payMap) payMap[method] += Number(p.amount || 0);
      }
    }
    for (const [m, amt] of Object.entries(payMap)) {
      if (amt <= 0) continue;
      const acc = m === 'cash' ? accounts.cash : m === 'card' ? accounts.cardClearing : m === 'transfer' ? accounts.transfer : m === 'cod' ? accounts.codClearing : accounts.storeCreditLiability;
      pushLine(acc || m, amt, 0, `Payments ${m}`);
      totalPayments += amt;
    }

    // COGS and inventory using valuation snapshots as of end of period delta; simple proxy using movements not available directly here.
    // For now, approximate COGS from returns and sales count with zero; hook into valuation engine externally by day if available.
    // If valuation method exists globally, compute daily difference is out of scope here; placeholder zero, callers can inject real values when integrated.
  } else {
    // Per receipt: create lines for each sale
    for (const s of sales) {
      const memoBase = `Sale ${String(s._id).slice(-6)}`;
      if ((s.total || 0) > 0) pushLine(accounts.sales || 'Sales', 0, s.total || 0, memoBase);
      const tax = Number((s as any).tax || 0);
      if (tax > 0) pushLine(accounts.taxPayable || 'Tax Payable', 0, tax, memoBase + ' tax');
      totalSales += (s.total || 0);
      totalTax += tax;
      const payForSale = paymentsAll.filter((p) => p.saleId === s._id);
      for (const p of payForSale) {
        const method = (p.method === 'cod_remit') ? 'cod' : String(p.method || '');
        const acc = method === 'cash' ? accounts.cash : method === 'card' ? accounts.cardClearing : method === 'transfer' ? accounts.transfer : method === 'cod' ? accounts.codClearing : accounts.storeCreditLiability;
        pushLine(acc || method, p.amount || 0, 0, memoBase + ` payment ${method}`);
        totalPayments += p.amount || 0;
      }
    }
    // Returns reverse
    for (const r of returns) {
      const value = (r.lines || []).reduce((ss: number, l: any) => ss + (l.qty * l.unitPrice), 0);
      if (value > 0) pushLine(accounts.returns || 'Returns', value, 0, `Return ${String(r._id).slice(-6)}`);
    }
  }

  // Balance with rounding account
  const res = balanceLines(lines, roundingAcc);
  const debit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const credit = round2(lines.reduce((s, l) => s + l.credit, 0));
  return { lines: res.lines, totals: { debit, credit, roundingAdj: round2(res.delta), sales: round2(totalSales), tax: round2(totalTax), payments: round2(totalPayments), cogs: round2(totalCogs) } };
}

