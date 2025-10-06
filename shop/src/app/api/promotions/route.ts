import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Promotion } from '@/lib/models/Promotion';
import { PromotionSchema } from '@/lib/validators/promotion';

export async function GET() {
  await dbConnect();
  const items = await Promotion.find({}).sort({ priority: 1 }).lean();
  return NextResponse.json({ promotions: items });
}

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const parsed = PromotionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await Promotion.create(parsed.data);
  return NextResponse.json({ promotion: created.toObject() });
}
