export type Installment = {
  seq: number;
  dueDate: string; // ISO
  amount: number;
  paidAt?: string;
};

export type LayawayRecord = {
  _id: string;
  customerId?: string;
  createdAt: number;
  total: number;
  paid: number;
  status: 'partially_paid'|'paid'|'cancelled'|'open';
  paymentPlan?: { remaining: number; schedule?: Installment[] };
};

export type AgingBuckets = {
  '0-7': number;
  '8-14': number;
  '15-30': number;
  '>30': number;
};

export function computeNextDue(schedule?: Installment[]): { nextDueDate?: string; overdueDays?: number } {
  if (!schedule || schedule.length === 0) return {};
  const upcoming = schedule.find((s) => !s.paidAt);
  if (!upcoming) return {};
  const due = new Date(upcoming.dueDate).getTime();
  const today = Date.now();
  const overdueDays = Math.max(0, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
  return { nextDueDate: upcoming.dueDate, overdueDays: overdueDays > 0 ? overdueDays : undefined };
}

export function bucketize(records: LayawayRecord[]): AgingBuckets {
  const buckets: AgingBuckets = { '0-7': 0, '8-14': 0, '15-30': 0, '>30': 0 };
  const now = Date.now();
  for (const r of records) {
    if (r.status !== 'partially_paid') continue;
    const next = computeNextDue(r.paymentPlan?.schedule);
    const overdue = next.overdueDays || 0;
    const remaining = r.paymentPlan?.remaining ?? Math.max(0, r.total - r.paid);
    if (overdue <= 7) buckets['0-7'] += remaining;
    else if (overdue <= 14) buckets['8-14'] += remaining;
    else if (overdue <= 30) buckets['15-30'] += remaining;
    else buckets['>30'] += remaining;
  }
  return buckets;
}

