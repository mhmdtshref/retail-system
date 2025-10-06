import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Promotion } from '@/lib/models/Promotion';
import { PromotionSchema } from '@/lib/validators/promotion';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const doc = await Promotion.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ promotion: doc });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const body = await req.json();
  const parsed = PromotionSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  const updated = await Promotion.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ promotion: updated });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  await Promotion.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
