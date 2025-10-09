import { NextResponse } from 'next/server';
import { getAvailabilityBulk } from '@/lib/inventory/availability';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skusParams = url.searchParams.getAll('skus[]');
  const skusSingle = url.searchParams.getAll('skus');
  const skus = (skusParams.length ? skusParams : skusSingle).filter(Boolean);
  const locationId = url.searchParams.get('locationId') || undefined;
  const map = await getAvailabilityBulk(skus as string[], { locationId: locationId || undefined });
  const out = (skus as string[]).map((sku) => ({ sku, ...map[sku] }));
  return NextResponse.json({ availability: out });
}


