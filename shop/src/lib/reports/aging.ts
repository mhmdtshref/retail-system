import { Layaway } from '@/lib/models/Layaway';
import { dbConnect } from '@/lib/db/mongo';

export type AgingBucketKey = 'UPCOMING_7'|'PD_0_7'|'PD_8_14'|'PD_15_30'|'PD_GT_30';
export type AgingMetrics = { range: { start: string; end: string }; buckets: { key: AgingBucketKey; count: number; balance: number }[]; totals: { count: number; balance: number; avgDaysPastDue: number } };

export async function getLayawayAging(fromIso: string, toIso: string): Promise<AgingMetrics> {
  await dbConnect();
  const start = new Date(fromIso).toISOString();
  const end = new Date(toIso).toISOString();
  const docs = await Layaway.find({ createdAt: { $gte: start }, dueAt: { $lte: end }, status: { $in: ['active','overdue'] } }).lean();
  const now = Date.now();
  const buckets: Record<AgingBucketKey, { count: number; balance: number }> = {
    UPCOMING_7: { count: 0, balance: 0 }, PD_0_7: { count: 0, balance: 0 }, PD_8_14: { count: 0, balance: 0 }, PD_15_30: { count: 0, balance: 0 }, PD_GT_30: { count: 0, balance: 0 }
  };
  let totalCount = 0; let totalBalance = 0; let totalDaysPast = 0; let daysCounted = 0;
  for (const l of docs as any[]) {
    const due = Date.parse(l.dueAt);
    const bal = Number(l.totals?.balance || 0);
    totalCount++; totalBalance += bal;
    const days = Math.floor((now - due) / 86400000);
    if (days > 0) { totalDaysPast += days; daysCounted++; }
    if (days <= -7) buckets.UPCOMING_7.count++, buckets.UPCOMING_7.balance += bal;
    else if (days <= 0) buckets.PD_0_7.count++, buckets.PD_0_7.balance += bal;
    else if (days <= 14) buckets.PD_8_14.count++, buckets.PD_8_14.balance += bal;
    else if (days <= 30) buckets.PD_15_30.count++, buckets.PD_15_30.balance += bal;
    else buckets.PD_GT_30.count++, buckets.PD_GT_30.balance += bal;
  }
  const avgDaysPastDue = daysCounted > 0 ? totalDaysPast / daysCounted : 0;
  return { range: { start, end }, buckets: Object.entries(buckets).map(([k, v]) => ({ key: k as AgingBucketKey, count: v.count, balance: v.balance })), totals: { count: totalCount, balance: totalBalance, avgDaysPastDue } };
}

