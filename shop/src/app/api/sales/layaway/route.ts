import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { bucketize, computeNextDue } from '@/lib/aging';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as any;
  const customerId = searchParams.get('customerId') || undefined;
  const dateFrom = searchParams.get('from') ? Number(searchParams.get('from')) : undefined;
  const dateTo = searchParams.get('to') ? Number(searchParams.get('to')) : undefined;
  const list = mockDb.listLayaway({ status, customerId, dateFrom, dateTo }) as any[];
  const records = list.map((s) => ({
    _id: s._id,
    customerId: s.customerId,
    createdAt: s.createdAt,
    total: s.total,
    paid: s.paid,
    status: s.status,
    paymentPlan: s.paymentPlan,
  }));
  const rollup = bucketize(records as any);
  const rows = records.map((r) => {
    const next = computeNextDue(r.paymentPlan?.schedule);
    return {
      id: r._id,
      customerId: r.customerId,
      createdAt: r.createdAt,
      remaining: r.paymentPlan?.remaining ?? Math.max(0, r.total - r.paid),
      nextDueDate: next.nextDueDate,
      overdueDays: next.overdueDays || 0,
      status: r.status,
    };
  });
  return NextResponse.json({ rows, rollup });
}

