import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Product } from '@/lib/models/Product';
import { ProductUpdateSchema } from '@/lib/validators/product';
import { getIfExists, saveResult } from '@/lib/idempotency';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const doc = await Product.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product: doc });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  const existing = await getIfExists(idempotencyKey);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = ProductUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const doc = await Product.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true }).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const res = { product: doc };
  await saveResult(idempotencyKey, res);
  return NextResponse.json(res);
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  // Soft delete by setting status archived for safer default
  const doc = await Product.findByIdAndUpdate(id, { status: 'archived' }, { new: true }).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product: doc, archived: true });
}


