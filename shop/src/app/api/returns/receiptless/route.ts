import { NextRequest, NextResponse } from 'next/server';
import { ReceiptlessReturnCreateSchema, ReceiptlessReturnListQuerySchema } from '@/lib/validators/receiptless';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { writeAudit } from '@/lib/security/audit';
import { getReceiptlessPolicy, checkLimits, addDailyCounters } from '@/lib/returns/policy';
import { mockDb } from '@/lib/mock/store';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';

// Temporary in-memory slip store until real models wired
const g = globalThis as unknown as { __slips?: Map<string, any> };
if (!g.__slips) g.__slips = new Map();

function slipCode(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const seq = Math.random().toString(36).slice(2,6).toUpperCase();
  return `RS-${ymd}-${seq}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const url = new URL(req.url);
  const parsed = ReceiptlessReturnListQuerySchema.safeParse({
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
    storeId: url.searchParams.get('storeId') || undefined,
    cashierId: url.searchParams.get('cashierId') || undefined,
    status: url.searchParams.get('status') || undefined,
    method: url.searchParams.get('method') || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const q = parsed.data;
  const list = Array.from(g.__slips!.values()).filter((s: any) => {
    const ts = s.createdAt as number;
    if (q.dateFrom && ts < Number(q.dateFrom)) return false;
    if (q.dateTo && ts > Number(q.dateTo)) return false;
    if (q.storeId && s.storeId !== q.storeId) return false;
    if (q.cashierId && s.cashierId !== q.cashierId) return false;
    if (q.status && s.status !== q.status) return false;
    if (q.method && s.method !== q.method) return false;
    return true;
  }).sort((a,b)=> b.createdAt - a.createdAt);
  return NextResponse.json({ results: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;

  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  // Idempotency replay
  const g = globalThis as unknown as { __slips?: Map<string, any> };
  if (!g.__slips) g.__slips = new Map();
  if (g.__slips.has(idempotencyKey)) {
    const existing = g.__slips.get(idempotencyKey);
    return NextResponse.json({ slip: existing });
  }

  // Basic per-user rate limit
  const rl = await takeRateLimit(req, { limit: 10, windowMs: 60_000, burst: 5 }, 'returns:receiptless', user.id);
  if (rl.limited) return rl.response!;

  const body = await req.json();
  const parsed = ReceiptlessReturnCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  const policy = getReceiptlessPolicy();
  if (!policy.enabled) return NextResponse.json({ error: { message: 'الإرجاع بدون فاتورة معطل' } }, { status: 403 });

  // Validate method allowed
  if (!policy.allowedMethods[input.method]) {
    return NextResponse.json({ error: { message: 'طريقة الاسترداد غير مسموحة' } }, { status: 400 });
  }

  // Basic amount checks
  if (!(input.amount > 0)) return NextResponse.json({ error: { message: 'المبلغ يجب أن يكون أكبر من صفر' } }, { status: 400 });

  // Limits and approvals
  const limits = checkLimits(user.role as any, user.id, input.amount);
  let approvedById: string | undefined;
  if (!limits.allowed) {
    const allowed = await requireCan(req, auth.user, 'POS.REFUND_CONFIRM');
    if (allowed !== true) {
      await writeAudit({ action: 'refund.create', status: 'denied', actor: { id: user.id, role: user.role }, req, meta: { reason: 'over_limit' } });
      return allowed; // will be 403
    }
    approvedById = user.id;
  }

  // Create slip in memory
  const slip = {
    _id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    slipCode: slipCode(),
    amount: input.amount,
    currency: input.currency,
    method: input.method,
    reason: input.reason,
    note: input.note,
    inventory: input.inventory,
    customerId: input.customerId,
    attachments: input.attachments,
    storeId: 'default',
    cashierId: user.id,
    approvedById,
    status: 'POSTED',
    createdAt: Date.now(),
    postedAt: Date.now(),
  } as const;
  g.__slips!.set(idempotencyKey, slip);

  // Accounting hooks via existing mockDb: create Refund record or CreditNote
  try {
    if (slip.method === 'STORE_CREDIT') {
      if (!slip.customerId) throw new Error('customerId required for store credit');
      mockDb.issueStoreCredit({ customerId: slip.customerId, amount: slip.amount, origin: { type: 'manual' } });
    } else {
      // Create manual refund record for reconciliation (mock store)
      mockDb.createRefund({ origin: { type: 'manual' }, amount: slip.amount, method: slip.method.toLowerCase() as any, customerId: slip.customerId, notes: slip.note });
    }
  } catch {}

  addDailyCounters(user.id, input.amount);
  const res = NextResponse.json({ slip });
  await writeAudit({ action: 'refund.create', status: 'success', actor: { id: user.id, role: user.role }, req, entity: { type: 'ReturnSlip', id: slip._id, code: slip.slipCode }, meta: { amount: slip.amount, method: slip.method, reason: slip.reason || '' } });
  return applyRateHeaders(res, rl.headers);
}
