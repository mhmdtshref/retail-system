import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { getDailyReport } from '@/lib/reports/daily';
import { buildSimpleArabicPdfA4, csvFromRows } from '@/lib/reports/format';

const BodySchema = z.object({
  kind: z.enum(['daily','aging','valuation']),
  params: z.any(),
  format: z.enum(['csv','pdf'])
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) {
    return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير أو المالك' } }, { status: 403 });
  }
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { kind, params, format } = parsed.data;

  if (kind === 'daily') {
    const data = await getDailyReport(params);
    if (format === 'csv') {
      const rows: Array<[string,string]> = [
        ['الفواتير', String(data.counters.invoices)],
        ['العناصر', String(data.counters.items)],
        ['إجمالي المبيعات', data.counters.grossSales.toFixed(2)],
        ['الخصومات', data.counters.discounts.toFixed(2)],
        ['المردودات', data.counters.returns.toFixed(2)],
        ['صافي المبيعات', data.counters.netSales.toFixed(2)],
        ['الضريبة', data.counters.tax.toFixed(2)],
        ['هامش الربح', data.counters.margin.toFixed(2)]
      ];
      const csv = csvFromRows(['البند','القيمة'], rows as any);
      return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="daily.csv"' } });
    } else {
      const pdf = await buildSimpleArabicPdfA4('تقرير يومي', [
        ['الفواتير', String(data.counters.invoices)],
        ['صافي المبيعات', data.counters.netSales.toFixed(2)],
        ['الضريبة', data.counters.tax.toFixed(2)]
      ]);
      return new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="daily.pdf"' } });
    }
  }

  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

