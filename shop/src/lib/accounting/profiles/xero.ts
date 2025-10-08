import { toCsv } from '@/lib/csv';
import type { JournalLine } from '../balancer';

export function toXeroJournalCsv(lines: JournalLine[]): string {
  const headers = ['Date','JournalNumber','LineNumber','AccountCode','Description','Debit','Credit','TaxType','TrackingName1','TrackingOption1'];
  const rows = lines.map((l) => ({
    'Date': l.date,
    'JournalNumber': l.journalNo || '',
    'LineNumber': String(l.lineNo),
    'AccountCode': l.account,
    'Description': l.memo || '',
    'Debit': (l.debit || 0).toFixed(2),
    'Credit': (l.credit || 0).toFixed(2),
    'TaxType': '',
    'TrackingName1': '',
    'TrackingOption1': ''
  }));
  return toCsv(headers, rows);
}

