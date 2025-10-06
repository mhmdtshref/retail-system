import { NextResponse } from 'next/server';
import { z } from 'zod';
import { redeemCoupon } from '@/lib/discounts/coupons';

const ReqSchema = z.object({
  code: z.string(),
  saleId: z.string(),
  customerId: z.string().optional()
});

export async function POST(req: Request) {
  const idemp = req.headers.get('Idempotency-Key') || '';
  const body = await req.json();
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const snapshot = await redeemCoupon({ ...parsed.data, idempotencyKey: idemp });
  return NextResponse.json({ coupon: snapshot });
}
