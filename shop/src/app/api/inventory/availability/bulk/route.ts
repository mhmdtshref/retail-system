import { NextResponse } from 'next/server';
import availability from '@/data/availability.json';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skusParams = url.searchParams.getAll('skus[]');
  const skusSingle = url.searchParams.getAll('skus');
  const skus = (skusParams.length ? skusParams : skusSingle).filter(Boolean);
  const now = Date.now();
  const map = new Map((availability as any[]).map((a) => [a.sku, a]));
  const out = (skus as string[]).map((sku) => {
    const a = map.get(sku);
    return a ? { ...a, asOf: now } : { sku, onHand: 0, reserved: 0, available: 0, asOf: now };
  });
  return NextResponse.json({ availability: out });
}

