import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';
import { getSettings } from '@/lib/settings/index';
import { requireAuth, requireCan } from '@/lib/policy/api';

const PaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'transfer', 'cod_remit', 'store_credit']),
  amount: z.number().positive(),
  seq: z.number().int().nonnegative()
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }

  const body = await req.json();
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  // Enforce allowed payment methods from Settings
  try {
    const s = await getSettings();
    const allowed: string[] = s?.payments?.enabledMethods || ['cash','card','transfer','store_credit','partial'];
    const map: Record<string,string> = { cod_remit: 'cod' };
    const methodKey = map[parsed.data.method] || parsed.data.method;
    if (!allowed.includes(methodKey)) {
      return NextResponse.json({ error: { message: 'مرفوض: طريقة الدفع غير مفعلة' } }, { status: 403 });
    }
  } catch {}
  const result = mockDb.addPayment({ saleId: id, ...parsed.data } as any);
  mockDb.set(idempotencyKey, result);
  try {
    const ev = parsed.data.method === 'cod_remit' ? 'DELIVERED' : 'ORDER_PAID';
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${idempotencyKey}:notif:${ev.toLowerCase()}` },
      body: JSON.stringify({ event: ev, entity: { type: 'order', id }, customerId: undefined })
    }).catch(()=>{});
  } catch {}
  return NextResponse.json(result);
}

