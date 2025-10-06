import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { CouponBatch } from '@/lib/models/CouponBatch';
import { Coupon } from '@/lib/models/Coupon';

const BatchReq = z.object({
  prefix: z.string().min(1),
  count: z.number().int().positive().max(10000),
  type: z.enum(['percent','amount']),
  value: z.number().nonnegative(),
  constraints: z.any().optional(),
  scope: z.any().optional(),
  expiresAt: z.string().optional()
});

function makeCode(prefix: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return `${prefix}-${s}`.toUpperCase();
}

export async function GET() {
  await dbConnect();
  const batches = await CouponBatch.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ batches });
}

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const parsed = BatchReq.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { prefix, count, type, value, constraints, scope, expiresAt } = parsed.data;
  const batch = await CouponBatch.create({ prefix, count, type, value, constraints, scope, expiresAt, generated: false });
  const codes: string[] = [];
  const docs: any[] = [];
  for (let i=0;i<count;i++) {
    const code = makeCode(prefix);
    codes.push(code);
    docs.push({ code, batchId: batch._id, name: prefix, type, value, constraints, scope, expiresAt, active: true });
  }
  await Coupon.insertMany(docs, { ordered: false }).catch(()=>{});
  await CouponBatch.findByIdAndUpdate(batch._id, { generated: true });
  const csv = ['code'].concat(codes).join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv' } });
}
