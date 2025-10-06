import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { CartInput, EvaluateContext } from '@/lib/discounts/types';
import { validateCoupon } from '@/lib/discounts/coupons';

const ReqSchema = z.object({
  code: z.string(),
  cart: z.object({
    lines: z.array(z.object({ sku: z.string(), qty: z.number().int().positive(), unitPrice: z.number().nonnegative() })),
    subtotal: z.number().nonnegative()
  }),
  channel: z.enum(['retail','online']).default('retail')
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { code, cart, channel } = parsed.data;
  const ctx: EvaluateContext = { channel, stackingPolicy: 'allow_both' } as any;
  const res = await validateCoupon(code, cart as CartInput, ctx);
  return NextResponse.json(res);
}
