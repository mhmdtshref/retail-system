export type Role = 'owner'|'manager'|'cashier'|'staff'|'viewer';

export type ReceiptlessPolicy = {
  enabled: boolean;
  limits: Record<Role, { maxPerTxn: number; maxDailyAmount: number; maxDailyCount: number }>;
  approvals: { overLimitRequiresManager: boolean; repeatedDeviceRequireManager: boolean; outsideHoursRequireManager?: boolean };
  allowedMethods: { CASH: boolean; CARD: boolean; STORE_CREDIT: boolean };
  inventory: { defaultAction: 'NONE'|'PUT_BACK'|'WRITE_OFF'; allowed: Array<'NONE'|'PUT_BACK'|'WRITE_OFF'> };
  requirePhoto?: boolean;
  requireReason?: boolean;
};

const g = globalThis as unknown as { __receiptlessPolicy?: ReceiptlessPolicy; __receiptlessCounters?: Map<string, { amount: number; count: number; date: string }> };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getReceiptlessPolicy(): ReceiptlessPolicy {
  if (!g.__receiptlessPolicy) {
    g.__receiptlessPolicy = {
      enabled: false,
      limits: {
        owner: { maxPerTxn: 10000, maxDailyAmount: 100000, maxDailyCount: 1000 },
        manager: { maxPerTxn: 1000, maxDailyAmount: 5000, maxDailyCount: 20 },
        cashier: { maxPerTxn: 200, maxDailyAmount: 500, maxDailyCount: 5 },
        staff: { maxPerTxn: 100, maxDailyAmount: 200, maxDailyCount: 2 },
        viewer: { maxPerTxn: 0, maxDailyAmount: 0, maxDailyCount: 0 },
      },
      approvals: { overLimitRequiresManager: true, repeatedDeviceRequireManager: true },
      allowedMethods: { CASH: true, CARD: true, STORE_CREDIT: true },
      inventory: { defaultAction: 'NONE', allowed: ['NONE','PUT_BACK','WRITE_OFF'] },
      requirePhoto: false,
      requireReason: false
    };
  }
  return g.__receiptlessPolicy;
}

export function updateReceiptlessPolicy(patch: Partial<ReceiptlessPolicy>): ReceiptlessPolicy {
  const cur = getReceiptlessPolicy();
  const next: ReceiptlessPolicy = { ...cur, ...patch } as any;
  g.__receiptlessPolicy = next;
  return next;
}

export function getDailyCounters(key: string) {
  if (!g.__receiptlessCounters) g.__receiptlessCounters = new Map();
  const today = todayKey();
  const entry = g.__receiptlessCounters.get(key);
  if (!entry || entry.date !== today) {
    const next = { amount: 0, count: 0, date: today };
    g.__receiptlessCounters.set(key, next);
    return next;
  }
  return entry;
}

export function addDailyCounters(key: string, amount: number) {
  const cur = getDailyCounters(key);
  cur.amount += amount; cur.count += 1;
  g.__receiptlessCounters!.set(key, cur);
}

export function checkLimits(role: Role, cashierId: string, amount: number) {
  const policy = getReceiptlessPolicy();
  if (!policy.enabled) return { allowed: false, reason: 'disabled' } as const;
  const limits = policy.limits[role] || policy.limits.viewer;
  const overPerTxn = amount > limits.maxPerTxn;
  const counters = getDailyCounters(cashierId);
  const overDailyAmount = counters.amount + amount > limits.maxDailyAmount;
  const overDailyCount = counters.count + 1 > limits.maxDailyCount;
  return { allowed: !(overPerTxn || overDailyAmount || overDailyCount), overPerTxn, overDailyAmount, overDailyCount } as const;
}
