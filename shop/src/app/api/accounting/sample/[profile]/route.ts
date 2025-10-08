import { NextRequest, NextResponse } from 'next/server';

const samples: Record<string, { name: string; csv: string }> = {
  generic_csv: { name: 'generic_journal.csv', csv: 'Date,JournalNo,LineNo,Account,Debit,Credit,Memo,Entity,Reference,Currency\n2025-01-01,ACC-20250101,1,Sales,0.00,100.00,Revenue,,,SAR\n2025-01-01,ACC-20250101,2,Tax Payable,0.00,15.00,Tax,,,SAR\n2025-01-01,ACC-20250101,3,Cash,115.00,0.00,Payment,,,SAR\n' },
  quickbooks_csv: { name: 'quickbooks_journal.csv', csv: 'Date,Ref No.,Journal No.,Line No.,Account,Debit,Credit,Name,Memo\n2025-01-01,,ACC-20250101,1,Sales,0.00,100.00,,Revenue\n2025-01-01,,ACC-20250101,2,Tax Payable,0.00,15.00,,Tax\n2025-01-01,,ACC-20250101,3,Cash,115.00,0.00,,Payment\n' },
  xero_csv: { name: 'xero_journal.csv', csv: 'Date,JournalNumber,LineNumber,AccountCode,Description,Debit,Credit,TaxType,TrackingName1,TrackingOption1\n2025-01-01,ACC-20250101,1,Sales,Revenue,0.00,100.00,,,\n2025-01-01,ACC-20250101,2,Tax Payable,Tax,0.00,15.00,,,\n2025-01-01,ACC-20250101,3,Cash,Payment,115.00,0.00,,,\n' }
};

export async function GET(_req: NextRequest, context: { params: Promise<{ profile: string }> }) {
  const { profile } = await context.params;
  const s = samples[profile];
  if (!s) return NextResponse.json({ error: { message: 'Unknown profile' } }, { status: 404 });
  return new NextResponse(s.csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${s.name}"` } });
}

