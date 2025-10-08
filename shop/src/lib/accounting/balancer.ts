export type JournalLine = {
  date: string; // ISO yyyy-mm-dd
  journalNo: string;
  lineNo: number;
  account: string; // ASCII account name/code
  debit: number;
  credit: number;
  memo?: string;
  entity?: string;
  reference?: string;
  currency?: string;
  meta?: Record<string, string | number | undefined>;
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function balanceLines(lines: JournalLine[], roundingAccount: string): { lines: JournalLine[]; delta: number } {
  const debit = round2(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const credit = round2(lines.reduce((s, l) => s + (l.credit || 0), 0));
  const delta = round2(debit - credit);
  if (Math.abs(delta) < 0.005) return { lines, delta: 0 };
  const lineNo = (lines[lines.length - 1]?.lineNo || 0) + 1;
  if (delta > 0) {
    // Need credit to match
    lines.push({ date: lines[0]?.date || '', journalNo: lines[0]?.journalNo || '', lineNo, account: roundingAccount, debit: 0, credit: round2(delta), memo: 'Rounding adjustment' });
  } else {
    lines.push({ date: lines[0]?.date || '', journalNo: lines[0]?.journalNo || '', lineNo, account: roundingAccount, debit: round2(-delta), credit: 0, memo: 'Rounding adjustment' });
  }
  return { lines, delta };
}

