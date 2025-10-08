import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Layaway } from '@/lib/models/Layaway';
import { toCsv } from '@/lib/csv';

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const q: any = {};
  if (status) q.status = status;
  const items = await Layaway.find(q).limit(2000).lean();
  const rows = (items as any[]).map((d) => ({
    code: d.code,
    customerId: String(d.customerId || ''),
    grandTotal: Number(d.totals?.grandTotal || 0).toFixed(2),
    upfrontPaid: Number(d.totals?.upfrontPaid || 0).toFixed(2),
    balance: Number(d.totals?.balance || 0).toFixed(2),
    dueAt: d.dueAt,
    status: d.status
  }));
  const csv = toCsv(['code','customerId','grandTotal','upfrontPaid','balance','dueAt','status'], rows);
  const body = `\uFEFF${csv}`; // UTF-8 BOM
  return new NextResponse(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="layaway.csv"' } });
}

