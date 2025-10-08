import { toCsv } from '@/lib/csv';
import type { JournalLine } from '../balancer';

export function toQuickBooksJournalCsv(lines: JournalLine[]): string {
  const headers = ['Date','Ref No.','Journal No.','Line No.','Account','Debit','Credit','Name','Memo'];
  const rows = lines.map((l) => ({
    'Date': l.date,
    'Ref No.': l.reference || '',
    'Journal No.': l.journalNo || '',
    'Line No.': String(l.lineNo),
    'Account': l.account,
    'Debit': (l.debit || 0).toFixed(2),
    'Credit': (l.credit || 0).toFixed(2),
    'Name': l.entity || '',
    'Memo': l.memo || ''
  }));
  return toCsv(headers, rows);
}

export type BankTxn = { date: string; refNo?: string; payee?: string; account: string; amount: number; memo?: string; bankAccount: string };

export function toQuickBooksBankCsv(rowsIn: BankTxn[]): string {
  const headers = ['Date','Ref No.','Payee','Account','Amount','Memo','Bank Account'];
  const rows = rowsIn.map((r) => ({
    'Date': r.date,
    'Ref No.': r.refNo || '',
    'Payee': r.payee || '',
    'Account': r.account,
    'Amount': (r.amount || 0).toFixed(2),
    'Memo': r.memo || '',
    'Bank Account': r.bankAccount
  }));
  return toCsv(headers, rows);
}

