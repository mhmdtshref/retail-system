import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { recordLayawayPayment } from '@/lib/layaway/service';

const PaymentSchema = z.object({ amount: z.number().positive(), method: z.enum(['cash','card','transfer','store_credit']) });

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  const idk = req.headers.get('Idempotency-Key') || '';
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const { id } = await context.params;
  const body = await req.json();
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const layaway = await recordLayawayPayment(id, parsed.data);
    const out = { layaway };
    await saveResult(idk, out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Failed' } }, { status: 400 });
  }
}

