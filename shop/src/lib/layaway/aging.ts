export type AgingBucket = 'UPCOMING_7'|'PD_0_7'|'PD_8_14'|'PD_15_30'|'PD_GT_30'|null;

export function getBucket(dueAtIso: string, today: Date = new Date()): AgingBucket {
  try {
    const due = new Date(dueAtIso);
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((startOfToday.getTime() - Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())) / msPerDay);
    if (diffDays < 0) {
      const daysUntil = Math.abs(diffDays);
      return daysUntil <= 7 ? 'UPCOMING_7' : null;
    }
    if (diffDays <= 7) return 'PD_0_7';
    if (diffDays <= 14) return 'PD_8_14';
    if (diffDays <= 30) return 'PD_15_30';
    return 'PD_GT_30';
  } catch {
    return null;
  }
}

export type LayawayLike = { status: 'active'|'overdue'|'completed'|'canceled'|'forfeited'; dueAt: string; createdAt: string };
export type PartialSettings = { payments?: { partial?: { graceDays?: number; autoCancel?: boolean; forfeitDays?: number } } };

export function computeStatus(l: LayawayLike, settings: PartialSettings, today: Date = new Date()): LayawayLike['status'] {
  if (l.status === 'completed' || l.status === 'canceled' || l.status === 'forfeited') return l.status;
  const grace = settings?.payments?.partial?.graceDays ?? 0;
  const autoCancel = settings?.payments?.partial?.autoCancel ?? false;
  const forfeitDays = settings?.payments?.partial?.forfeitDays ?? 30;
  const due = new Date(l.dueAt);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysPastDue = Math.floor((today.getTime() - due.getTime()) / msPerDay);
  if (daysPastDue > grace) {
    if (autoCancel && daysPastDue > (grace + forfeitDays)) return 'forfeited';
    return 'overdue';
  }
  return 'active';
}

