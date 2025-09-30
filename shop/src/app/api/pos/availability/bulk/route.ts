import { NextResponse } from 'next/server';
import { getAvailabilityBulk } from '@/lib/inventory/availability';

export async function POST(req: Request) {
  const { skus } = await req.json();
  const map = await getAvailabilityBulk(skus as string[]);
  const out = (skus as string[]).map((sku) => ({ sku, ...map[sku] }));
  return NextResponse.json({ availability: out });
}

