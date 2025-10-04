import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Product } from '@/lib/models/Product';
import { getAvailabilityBulk } from '@/lib/inventory/availability';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const doc = await Product.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const skus = (doc.variants || []).map((v: any) => v.sku).filter(Boolean);
  const map = await getAvailabilityBulk(skus);
  const out = skus.map((sku) => ({ sku, ...map[sku] }));
  return NextResponse.json({ availability: out });
}


