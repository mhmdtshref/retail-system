import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { dbConnect } from '@/lib/db/mongo';
import { AccountingSettings } from '@/lib/models/AccountingSettings';
import { ExportBatch } from '@/lib/models/ExportBatch';
import { buildNormalizedJournal } from '@/lib/accounting/exporter';
import { computeParamsHash, deterministicBatchId } from '@/lib/accounting/idempotency';
import { toGenericJournalCsv } from '@/lib/accounting/profiles/generic';
import { toQuickBooksJournalCsv, toQuickBooksBankCsv } from '@/lib/accounting/profiles/quickbooks';
import { toXeroJournalCsv } from '@/lib/accounting/profiles/xero';
import { sha256Hex } from '@/lib/accounting/idempotency';

const BodySchema = z.object({
  from: z.string(), to: z.string(),
  profile: z.enum(['generic_csv','quickbooks_csv','xero_csv']).optional(),
  consolidation: z.enum(['daily_summary','per_receipt']).optional(),
  dateBasis: z.enum(['order_date','payment_date']).optional()
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) {
    return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير أو المالك' } }, { status: 403 });
  }
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await dbConnect().catch(()=>{});
  const acc: any = await AccountingSettings.findById('global').lean().catch(()=>null);
  if (!acc || !acc.accounts) return NextResponse.json({ error: { message: 'Missing accounting settings' } }, { status: 400 });

  const profile = parsed.data.profile || acc.provider || 'generic_csv';
  const consolidation = parsed.data.consolidation || acc.consolidation || 'daily_summary';
  const dateBasis = parsed.data.dateBasis || acc.dateBasis || 'order_date';
  const tz = acc.tz || 'Asia/Riyadh';
  const baseCurrency = acc.baseCurrency || 'SAR';

  const params = { from: parsed.data.from, to: parsed.data.to, profile, consolidation, dateBasis, tz, baseCurrency };
  const paramsHash = computeParamsHash({ ...params, accounts: acc.accounts });
  const batchId = deterministicBatchId(`ACC-${parsed.data.from.replace(/-/g,'')}`, paramsHash);

  const existing = await ExportBatch.findById(batchId).lean().catch(()=>null);
  if (existing && idempotencyKey) {
    return NextResponse.json(existing);
  }

  const normalized = await buildNormalizedJournal(params);
  const journalCsv = profile === 'quickbooks_csv' ? toQuickBooksJournalCsv(normalized.lines)
                     : profile === 'xero_csv' ? toXeroJournalCsv(normalized.lines)
                     : toGenericJournalCsv(normalized.lines);
  const sha = sha256Hex(journalCsv);
  const files = [{ kind: 'journal' as const, name: `${batchId}-journal.csv`, sha256: sha, bytes: Buffer.byteLength(journalCsv) }];

  // Optional Bank Transactions for QuickBooks when bank accounts mapping exists
  let bankCsv: string | null = null;
  if (profile === 'quickbooks_csv' && acc?.bankAccounts && (acc.bankAccounts.cash || acc.bankAccounts.card || acc.bankAccounts.transfer)) {
    const paymentsByAccount: Array<{ method: 'cash'|'card'|'transfer'; amount: number; bankAccount?: string }> = [];
    const methodToAccount: Record<'cash'|'card'|'transfer', string | undefined> = {
      cash: acc.accounts?.cash,
      card: acc.accounts?.cardClearing,
      transfer: acc.accounts?.transfer
    };
    const methodToBank: Record<'cash'|'card'|'transfer', string | undefined> = {
      cash: acc.bankAccounts?.cash,
      card: acc.bankAccounts?.card,
      transfer: acc.bankAccounts?.transfer
    };
    for (const m of ['cash','card','transfer'] as const) {
      const account = methodToAccount[m];
      const bank = methodToBank[m];
      if (!bank || !account) continue;
      const amt = normalized.lines.filter((l) => l.account === account && (l.debit || 0) > 0).reduce((s, l) => s + (l.debit || 0), 0);
      if (amt > 0) paymentsByAccount.push({ method: m, amount: amt, bankAccount: bank });
    }
    if (paymentsByAccount.length) {
      const bankRows = paymentsByAccount.map((p) => ({ date: params.to, refNo: batchId, payee: 'Walk-in', account: methodToAccount[p.method]!, amount: p.amount, memo: 'Daily deposit', bankAccount: p.bankAccount! }));
      bankCsv = toQuickBooksBankCsv(bankRows);
      files.push({ kind: 'bank' as const, name: `${batchId}-bank.csv`, sha256: sha256Hex(bankCsv), bytes: Buffer.byteLength(bankCsv) });
    }
  }

  const batch = {
    _id: batchId,
    rangeLocal: { start: parsed.data.from, end: parsed.data.to },
    tz, baseCurrency, profile, consolidation, dateBasis,
    paramsHash, rowCount: normalized.lines.length, files,
    totals: normalized.totals,
    createdBy: auth.user?.id || 'system', createdAt: new Date().toISOString(), status: 'ready' as const
  };
  await ExportBatch.findOneAndUpdate({ _id: batchId }, { $set: batch }, { upsert: true, new: true }).lean().catch(()=>{});

  const response = { ...batch } as any;
  return NextResponse.json(response);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) {
    return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير أو المالك' } }, { status: 403 });
  }
  await dbConnect().catch(()=>{});
  const list = await ExportBatch.find({}, null, { sort: { createdAt: -1 }, limit: 50 }).lean().catch(()=>[] as any);
  return NextResponse.json(list);
}

