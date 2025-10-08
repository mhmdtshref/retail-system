export type Bucket = 'UPCOMING_7' | 'PD_0_7' | 'PD_8_14' | 'PD_15_30' | 'PD_GT_30' | 'NONE';

export function getBucket(dueAtIso: string, today: Date = new Date()): Bucket {
  if (!dueAtIso) return 'NONE';
  const due = new Date(dueAtIso).getTime();
  const now = today.getTime();
  const diffDays = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
  if (due >= now) {
    const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 ? 'UPCOMING_7' : 'NONE';
  }
  // past due
  if (diffDays <= 7) return 'PD_0_7';
  if (diffDays <= 14) return 'PD_8_14';
  if (diffDays <= 30) return 'PD_15_30';
  return 'PD_GT_30';
}

export function computeStatus(current: 'active'|'overdue'|'completed'|'canceled'|'forfeited', dueAtIso: string, settings: { graceDays?: number; forfeitDays?: number; autoCancel?: boolean }, today: Date = new Date()): 'active'|'overdue'|'completed'|'canceled'|'forfeited' {
  if (current === 'completed' || current === 'canceled' || current === 'forfeited') return current;
  const grace = settings.graceDays ?? 0;
  const forfeitDays = settings.forfeitDays ?? 30;
  const now = today.getTime();
  const due = new Date(dueAtIso).getTime();
  const overdueTs = due + grace * 24 * 60 * 60 * 1000;
  const forfeitTs = due + forfeitDays * 24 * 60 * 60 * 1000;
  if (now >= forfeitTs && settings.autoCancel) {
    return 'forfeited';
  }
  if (now >= overdueTs) {
    return 'overdue';
  }
  return 'active';
}

