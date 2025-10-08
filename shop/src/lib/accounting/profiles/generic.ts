import { toCsv } from '@/lib/csv';
import type { JournalLine } from '../balancer';

export function toGenericJournalCsv(lines: JournalLine[]): string {
  const headers = ['Date','JournalNo','LineNo','Account','Debit','Credit','Memo','Entity','Reference','Currency'];
  const rows = lines.map((l) => ({
    Date: l.date,
    JournalNo: l.journalNo || '',
    LineNo: String(l.lineNo),
    Account: l.account,
    Debit: (l.debit || 0).toFixed(2),
    Credit: (l.credit || 0).toFixed(2),
    Memo: l.memo || '',
    Entity: l.entity || '',
    Reference: l.reference || '',
    Currency: l.currency || ''
  }));
  return toCsv(headers, rows);
}

