import { NextResponse } from 'next/server';
import { getAvailabilityBulk } from '@/lib/inventory/availability';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  // In a full implementation, we'd fetch product and all variant SKUs
  // For simplicity, expect skus[] param if provided
  const skusParams = url.searchParams.getAll('skus[]');
  const skusSingle = url.searchParams.getAll('skus');
  const skus = (skusParams.length ? skusParams : skusSingle).filter(Boolean);
  const map = await getAvailabilityBulk(skus as string[]);
  const out = (skus as string[]).map((sku) => ({ sku, ...map[sku] }));
  return NextResponse.json({ availability: out });
}


